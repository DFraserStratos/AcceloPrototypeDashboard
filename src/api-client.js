/**
 * Accelo API Client
 * Handles all API interactions with caching and error handling
 */

class AcceloAPI {
    constructor() {
        this.baseUrl = null;
        this.accessToken = null;
        this.tokenExpiry = null;
        this.deployment = null;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Initialize API client with settings
     */
    async init() {
        try {
            const response = await fetch('/api/settings');
            if (!response.ok) {
                throw new Error('No API settings configured. Please visit the settings page.');
            }
            
            const settings = await response.json();
            this.deployment = settings.deployment;
            this.baseUrl = `https://${this.deployment}.api.accelo.com/api/v0`;
            this.accessToken = settings.accessToken;
            this.tokenExpiry = new Date(settings.tokenExpiry);
            
            // Check if token is still valid
            if (this.tokenExpiry <= new Date()) {
                throw new Error('Access token has expired. Please re-authenticate in settings.');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize API:', error);
            throw error;
        }
    }

    /**
     * Make an API request with caching
     */
    async request(endpoint, options = {}) {
        // Check if we have valid credentials
        if (!this.accessToken || !this.baseUrl) {
            throw new Error('API not initialized. Please configure settings first.');
        }

        // Check if token is expired
        if (this.tokenExpiry <= new Date()) {
            throw new Error('Access token has expired. Please re-authenticate in settings.');
        }

        // Check cache first
        const cacheKey = `${endpoint}${JSON.stringify(options)}`;
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expires > new Date()) {
            console.log(`[CACHE HIT] ${endpoint}`);
            return cached.data;
        }

        // Prepare request
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
        const fetchOptions = {
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Target-URL': url
            }
        };

        if (options.body) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        try {
            console.log(`[API REQUEST] ${fetchOptions.method} ${endpoint}`);
            const response = await fetch('/api/proxy', fetchOptions);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.message || error.error || `API request failed: ${response.status}`);
            }

            const data = await response.json();
            
            // Cache the response
            if (fetchOptions.method === 'GET') {
                this.cache.set(cacheKey, {
                    data: data,
                    expires: new Date(Date.now() + this.cacheTimeout)
                });
            }

            return data;
        } catch (error) {
            console.error(`[API ERROR] ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('[CACHE] Cleared all cached data');
    }

    /**
     * Get companies
     */
    async getCompanies(filters = {}) {
        const params = new URLSearchParams({
            _fields: 'id,name,status,standing,website,phone,comments_count',
            _limit: filters.limit || 100,
            _offset: filters.offset || 0
        });

        if (filters.search) {
            params.append('_search', filters.search);
        }

        if (filters.standing) {
            params.append('_filters', `standing(${filters.standing})`);
        }

        const response = await this.request(`/companies?${params}`);
        return response.response || [];
    }

    /**
     * Get projects for a company
     */
    async getProjects(companyId, filters = {}) {
        const params = new URLSearchParams({
            _fields: 'id,title,standing,status,manager,date_started,date_due,billable,billable_seconds,unbillable_seconds',
            _filters: `against_type(company),against_id(${companyId})${filters.standing ? `,standing(${filters.standing})` : ''}`,
            _limit: filters.limit || 100
        });

        const response = await this.request(`/jobs?${params}`);
        return response.response || [];
    }

    /**
     * Get agreements for a company
     */
    async getAgreements(companyId, filters = {}) {
        const params = new URLSearchParams({
            _fields: 'id,title,standing,status,date_started,date_expires,retainer_type,retainer_value',
            _filters: `against_type(company),against_id(${companyId})${filters.standing ? `,standing(${filters.standing})` : ''}`,
            _limit: filters.limit || 100
        });

        const response = await this.request(`/contracts?${params}`);
        return response.response || [];
    }

    /**
     * Get activity allocations (hours) for a project
     */
    async getProjectHours(projectId) {
        try {
            const params = new URLSearchParams({
                _fields: 'id,against,billable,nonbillable,logged,charged',
                _filters: `against_type(job),against_id(${projectId})`
            });

            const response = await this.request(`/activities/allocations?${params}`);
            const allocations = response?.response || [];
            
            // Handle empty response
            if (!Array.isArray(allocations)) {
                console.warn(`Invalid allocations response for project ${projectId}`);
                return {
                    billableHours: 0,
                    nonBillableHours: 0,
                    loggedHours: 0,
                    chargedHours: 0
                };
            }
            
            // Sum up the hours
            const totals = allocations.reduce((acc, allocation) => {
                acc.billable += (allocation?.billable || 0);
                acc.nonbillable += (allocation?.nonbillable || 0);
                acc.logged += (allocation?.logged || 0);
                acc.charged += (allocation?.charged || 0);
                return acc;
            }, { billable: 0, nonbillable: 0, logged: 0, charged: 0 });

            // Convert seconds to hours
            return {
                billableHours: Math.round(totals.billable / 3600 * 10) / 10,
                nonBillableHours: Math.round(totals.nonbillable / 3600 * 10) / 10,
                loggedHours: Math.round(totals.logged / 3600 * 10) / 10,
                chargedHours: Math.round(totals.charged / 3600 * 10) / 10
            };
        } catch (error) {
            console.error(`Failed to get project hours for ${projectId}:`, error);
            return {
                billableHours: 0,
                nonBillableHours: 0,
                loggedHours: 0,
                chargedHours: 0
            };
        }
    }

    /**
     * Get current period usage for an agreement
     */
    async getAgreementUsage(agreementId) {
        try {
            const params = new URLSearchParams({
                _fields: 'id,date_commenced,date_expires,contract_budget',
                _limit: 1,
                _order_by: 'date_commenced',
                _order_by_desc: 1
            });

            const response = await this.request(`/contracts/${agreementId}/periods?${params}`);
            const periods = response?.response || [];
            
            // Handle empty or invalid response
            if (!Array.isArray(periods) || periods.length === 0) {
                console.log(`No periods found for agreement ${agreementId}`);
                return null;
            }
            
            const currentPeriod = periods[0];
            if (!currentPeriod) {
                return null;
            }
            
            const budget = currentPeriod?.contract_budget || {};
            
            return {
                periodStart: currentPeriod.date_commenced,
                periodEnd: currentPeriod.date_expires,
                timeAllowance: budget?.time ? Math.round(budget.time / 3600 * 10) / 10 : 0,
                timeUsed: budget?.time_used ? Math.round(budget.time_used / 3600 * 10) / 10 : 0,
                timeRemaining: budget?.time_remaining ? Math.round(budget.time_remaining / 3600 * 10) / 10 : 0
            };
        } catch (error) {
            console.error(`Failed to get agreement usage for ${agreementId}:`, error);
            return null;
        }
    }

    /**
     * Get all data for dashboard
     */
    async getDashboardData(companyIds = []) {
        const data = [];
        
        for (const companyId of companyIds) {
            try {
                // Get company details
                const companyResponse = await this.request(`/companies/${companyId}`);
                const company = companyResponse.response;
                
                // Get projects and agreements in parallel
                const [projects, agreements] = await Promise.all([
                    this.getProjects(companyId, { standing: 'active' }),
                    this.getAgreements(companyId, { standing: 'active' })
                ]);
                
                // Get hours for each project with rate limiting
                const projectsWithHours = [];
                for (const project of projects) {
                    try {
                        const hours = await this.getProjectHours(project.id);
                        projectsWithHours.push({ ...project, hours });
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        console.error(`Failed to get hours for project ${project.id}:`, error);
                        projectsWithHours.push({ ...project, hours: null });
                    }
                }
                
                // Get usage for each agreement with rate limiting
                const agreementsWithUsage = [];
                for (const agreement of agreements) {
                    try {
                        const usage = await this.getAgreementUsage(agreement.id);
                        agreementsWithUsage.push({ ...agreement, usage });
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        console.error(`Failed to get usage for agreement ${agreement.id}:`, error);
                        agreementsWithUsage.push({ ...agreement, usage: null });
                    }
                }
                
                data.push({
                    company,
                    projects: projectsWithHours,
                    agreements: agreementsWithUsage
                });
            } catch (error) {
                console.error(`Failed to load data for company ${companyId}:`, error);
                data.push({
                    company: { id: companyId, name: 'Error loading company' },
                    projects: [],
                    agreements: [],
                    error: error.message
                });
            }
        }
        
        return data;
    }

    /**
     * Search for companies, projects, and agreements
     */
    async searchAll(query) {
        try {
            // Include against field to get parent company info for projects and agreements
            const [companies, projects, agreements] = await Promise.all([
                this.request(`/companies?_search=${encodeURIComponent(query)}&_limit=20&_fields=id,name,website,phone,standing`),
                this.request(`/jobs?_search=${encodeURIComponent(query)}&_limit=20&_fields=id,title,standing,status,against`),
                this.request(`/contracts?_search=${encodeURIComponent(query)}&_limit=20&_fields=id,title,standing,status,against`)
            ]);

            // Process projects to include company info
            const processedProjects = (projects?.response || []).map(project => ({
                ...project,
                company_info: project.against || null
            }));

            // Process agreements to include company info
            const processedAgreements = (agreements?.response || []).map(agreement => ({
                ...agreement,
                company_info: agreement.against || null
            }));

            return {
                companies: companies?.response || [],
                projects: processedProjects,
                agreements: processedAgreements
            };
        } catch (error) {
            console.error('Search failed:', error);
            // Return empty results rather than throwing
            return {
                companies: [],
                projects: [],
                agreements: []
            };
        }
    }

    /**
     * Search for companies only
     */
    async searchCompanies(query) {
        try {
            const response = await this.request(`/companies?_search=${encodeURIComponent(query)}&_limit=20&_fields=id,name,website,phone,standing`);
            return response?.response || [];
        } catch (error) {
            console.error('Company search failed:', error);
            return [];
        }
    }

    /**
     * Get projects and agreements for selected companies
     */
    async getProjectsAndAgreements(companyIds = []) {
        try {
            const results = [];
            
            for (const companyId of companyIds) {
                // Get company details
                const companyResponse = await this.request(`/companies/${companyId}?_fields=id,name`);
                const company = companyResponse?.response;
                
                if (!company) continue;
                
                // Get projects and agreements for this company
                const [projects, agreements] = await Promise.all([
                    this.getProjects(companyId, { standing: 'active' }),
                    this.getAgreements(companyId, { standing: 'active' })
                ]);
                
                // Add company info to each project
                const projectsWithCompany = projects.map(project => ({
                    ...project,
                    company_info: company,
                    type: 'project'
                }));
                
                // Add company info to each agreement
                const agreementsWithCompany = agreements.map(agreement => ({
                    ...agreement,
                    company_info: company,
                    type: 'agreement'
                }));
                
                results.push({
                    company,
                    projects: projectsWithCompany,
                    agreements: agreementsWithCompany
                });
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            return results;
        } catch (error) {
            console.error('Failed to get projects and agreements:', error);
            return [];
        }
    }
}

// Export as singleton
window.acceloAPI = new AcceloAPI();
