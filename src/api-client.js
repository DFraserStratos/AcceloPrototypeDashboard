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
     * Get a specific project by ID
     */
    async getProject(projectId) {
        const params = new URLSearchParams({
            _fields: 'id,title,standing,status,manager,date_started,date_due,billable,billable_seconds,unbillable_seconds,company,affiliation'
        });

        const response = await this.request(`/jobs/${projectId}?${params}`);
        return response.response || null;
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
     * Get a specific agreement by ID
     */
    async getAgreement(agreementId) {
        const params = new URLSearchParams({
            _fields: 'id,title,standing,status,date_started,date_expires,retainer_type,retainer_value,company,affiliation'
        });

        const response = await this.request(`/contracts/${agreementId}?${params}`);
        return response.response || null;
    }

    /**
     * Get activity allocations (hours) for a project including all tasks and milestones
     */
    async getProjectHours(projectId) {
        try {
            console.log(`Getting complete project hours for project ${projectId}...`);
            
            // First, get the project's direct allocations
            const projectAllocParams = new URLSearchParams({
                _fields: 'id,against,billable,nonbillable,logged,charged',
                _filters: `against_type(job),against_id(${projectId})`
            });

            const projectAllocResponse = await this.request(`/activities/allocations?${projectAllocParams}`).catch(() => null);
            
            let totalBillable = 0;
            let totalNonBillable = 0;
            let totalLogged = 0;
            let totalCharged = 0;

            // Add project-level allocations
            if (projectAllocResponse?.response) {
                const allocation = Array.isArray(projectAllocResponse.response) 
                    ? projectAllocResponse.response[0] 
                    : projectAllocResponse.response;
                
                if (allocation) {
                    totalBillable += parseFloat(allocation.billable || 0);
                    totalNonBillable += parseFloat(allocation.nonbillable || 0);
                    totalLogged += parseFloat(allocation.logged || 0);
                    totalCharged += parseFloat(allocation.charged || 0);
                    console.log(`Project direct time: ${Math.round((totalBillable + totalNonBillable) / 3600 * 10) / 10}h`);
                }
            }

            // Get tasks and milestones for this project
            const tasksParams = new URLSearchParams({
                _fields: 'id,title',
                _filters: `against_type(job),against_id(${projectId})`,
                _limit: 100
            });

            const milestonesParams = new URLSearchParams({
                _fields: 'id,title',
                _limit: 100
            });

            const [tasksResponse, milestonesResponse] = await Promise.all([
                this.request(`/tasks?${tasksParams}`).catch(() => ({ response: [] })),
                this.request(`/jobs/${projectId}/milestones?${milestonesParams}`).catch(() => ({ response: [] }))
            ]);

            const tasks = tasksResponse?.response || [];
            const milestones = milestonesResponse?.response || [];
            
            console.log(`Found ${tasks.length} tasks and ${milestones.length} milestones for project ${projectId}`);

            // Get allocations for each task
            for (const task of tasks) {
                try {
                    // For tasks, we need to get time entries directly since allocations don't work
                    const taskActivitiesParams = new URLSearchParams({
                        _fields: 'id,billable,nonbillable',
                        _filters: `against_type(task),against_id(${task.id}),type(time)`,
                        _limit: 1000
                    });

                    const taskActivities = await this.request(`/activities?${taskActivitiesParams}`);
                    if (taskActivities?.response && Array.isArray(taskActivities.response)) {
                        let taskBillable = 0;
                        let taskNonBillable = 0;
                        
                        taskActivities.response.forEach(activity => {
                            taskBillable += parseFloat(activity.billable || 0);
                            taskNonBillable += parseFloat(activity.nonbillable || 0);
                        });
                        
                        if (taskBillable > 0 || taskNonBillable > 0) {
                            totalBillable += taskBillable;
                            totalNonBillable += taskNonBillable;
                            totalLogged += taskBillable + taskNonBillable;
                            console.log(`Task "${task.title}": ${Math.round((taskBillable + taskNonBillable) / 3600 * 10) / 10}h`);
                        }
                    }
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    console.warn(`Failed to get time for task ${task.id}:`, error.message);
                }
            }

            // Get allocations for each milestone - try both milestone allocations and sub-task allocations
            for (const milestone of milestones) {
                try {
                    // First try milestone allocations
                    const milestoneAllocParams = new URLSearchParams({
                        _fields: 'id,against,billable,nonbillable,logged,charged',
                        _filters: `against_type(milestone),against_id(${milestone.id})`
                    });

                    const milestoneAlloc = await this.request(`/activities/allocations?${milestoneAllocParams}`).catch(() => null);
                    
                    if (milestoneAlloc?.response) {
                        const allocation = Array.isArray(milestoneAlloc.response) 
                            ? milestoneAlloc.response[0] 
                            : milestoneAlloc.response;
                        
                        if (allocation) {
                            const milestoneBillable = parseFloat(allocation.billable || 0);
                            const milestoneNonBillable = parseFloat(allocation.nonbillable || 0);
                            totalBillable += milestoneBillable;
                            totalNonBillable += milestoneNonBillable;
                            totalLogged += parseFloat(allocation.logged || 0);
                            totalCharged += parseFloat(allocation.charged || 0);
                            console.log(`Milestone "${milestone.title}": ${Math.round((milestoneBillable + milestoneNonBillable) / 3600 * 10) / 10}h`);
                        }
                    }
                    
                    // Also get tasks under this milestone
                    const milestoneTasksParams = new URLSearchParams({
                        _fields: 'id,title',
                        _filters: `against_type(milestone),against_id(${milestone.id})`,
                        _limit: 100
                    });

                    const milestoneTasksResponse = await this.request(`/tasks?${milestoneTasksParams}`).catch(() => ({ response: [] }));
                    const milestoneTasks = milestoneTasksResponse?.response || [];
                    
                    // Get time for each task under the milestone
                    for (const mTask of milestoneTasks) {
                        const mTaskActivitiesParams = new URLSearchParams({
                            _fields: 'id,billable,nonbillable',
                            _filters: `against_type(task),against_id(${mTask.id}),type(time)`,
                            _limit: 1000
                        });

                        const mTaskActivities = await this.request(`/activities?${mTaskActivitiesParams}`).catch(() => ({ response: [] }));
                        if (mTaskActivities?.response && Array.isArray(mTaskActivities.response)) {
                            let mTaskBillable = 0;
                            let mTaskNonBillable = 0;
                            
                            mTaskActivities.response.forEach(activity => {
                                mTaskBillable += parseFloat(activity.billable || 0);
                                mTaskNonBillable += parseFloat(activity.nonbillable || 0);
                            });
                            
                            if (mTaskBillable > 0 || mTaskNonBillable > 0) {
                                totalBillable += mTaskBillable;
                                totalNonBillable += mTaskNonBillable;
                                totalLogged += mTaskBillable + mTaskNonBillable;
                                console.log(`  Milestone task "${mTask.title}": ${Math.round((mTaskBillable + mTaskNonBillable) / 3600 * 10) / 10}h`);
                            }
                        }
                    }
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    console.warn(`Failed to get allocations for milestone ${milestone.id}:`, error.message);
                }
            }

            // Convert seconds to hours
            const result = {
                billableHours: Math.round(totalBillable / 3600 * 10) / 10,
                nonBillableHours: Math.round(totalNonBillable / 3600 * 10) / 10,
                loggedHours: Math.round((totalBillable + totalNonBillable) / 3600 * 10) / 10,
                chargedHours: Math.round(totalCharged / 3600 * 10) / 10
            };
            
            console.log(`Project ${projectId} TOTAL hours:`, result);
            return result;
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
                _fields: 'id,date_commenced,date_expires,contract_budget,allowance,budget_used,standing',
                _limit: 50,
                _order_by: 'date_commenced',
                _order_by_desc: 1
            });

            const response = await this.request(`/contracts/${agreementId}/periods?${params}`);
            const periodsData = response?.response;
            const periods = periodsData?.periods || [];
            
            // Handle empty or invalid response
            if (!Array.isArray(periods) || periods.length === 0) {
                console.log(`No periods found for agreement ${agreementId}`);
                return null;
            }
            
            // Find the current period (the one with standing "opened")
            let currentPeriod = null;
            
            // First, look for an "opened" period
            for (const period of periods) {
                if (period.standing === 'opened') {
                    currentPeriod = period;
                    break;
                }
            }
            
            // If no opened period found, look for one that contains today's date
            if (!currentPeriod) {
                const now = Math.floor(Date.now() / 1000);
                for (const period of periods) {
                    const startDate = parseInt(period.date_commenced);
                    const endDate = parseInt(period.date_expires);
                    
                    if (now >= startDate && now <= endDate) {
                        currentPeriod = period;
                        break;
                    }
                }
            }
            
            // If still no current period found, use the most recent one
            if (!currentPeriod && periods.length > 0) {
                currentPeriod = periods[0];
            }
            
            if (!currentPeriod) {
                return null;
            }
            
            // Determine the period budget type and handle accordingly
            let budgetType = 'none'; // 'time', 'value', or 'none'
            let timeAllowance = 0;
            let timeUsed = 0;
            let valueAllowance = 0;
            let valueUsed = 0;
            
            // Check for time budget - must have meaningful billable allowance
            if (currentPeriod.allowance && currentPeriod.allowance.billable && parseFloat(currentPeriod.allowance.billable) > 0) {
                budgetType = 'time';
                timeAllowance = parseFloat(currentPeriod.allowance.billable) / 3600;
                
                if (currentPeriod.budget_used && currentPeriod.budget_used.value) {
                    timeUsed = parseFloat(currentPeriod.budget_used.value) / 3600;
                }
            }
            // Check for value budget - must have meaningful value/amount allowance
            else if (currentPeriod.allowance && 
                     ((currentPeriod.allowance.value && parseFloat(currentPeriod.allowance.value) > 0) || 
                      (currentPeriod.allowance.amount && parseFloat(currentPeriod.allowance.amount) > 0))) {
                budgetType = 'value';
                valueAllowance = parseFloat(currentPeriod.allowance.value || currentPeriod.allowance.amount || 0);
                
                if (currentPeriod.budget_used && currentPeriod.budget_used.amount) {
                    valueUsed = parseFloat(currentPeriod.budget_used.amount);
                }
            }
            // For agreements with no budget (Period Budget = "Off"), we still want to track time worked
            else {
                budgetType = 'none';
                // For no-budget agreements, get time worked from budget_used
                if (currentPeriod.budget_used && currentPeriod.budget_used.value) {
                    timeUsed = parseFloat(currentPeriod.budget_used.value) / 3600;
                }
            }
            
            const timeRemaining = timeAllowance - timeUsed;
            const valueRemaining = valueAllowance - valueUsed;
            
            return {
                budgetType: budgetType,
                periodStart: new Date(parseInt(currentPeriod.date_commenced) * 1000).toISOString().split('T')[0],
                periodEnd: new Date(parseInt(currentPeriod.date_expires) * 1000).toISOString().split('T')[0],
                timeAllowance: Math.round(timeAllowance * 10) / 10,
                timeUsed: Math.round(timeUsed * 10) / 10,
                timeRemaining: Math.round(timeRemaining * 10) / 10,
                valueAllowance: Math.round(valueAllowance * 100) / 100,
                valueUsed: Math.round(valueUsed * 100) / 100,
                valueRemaining: Math.round(valueRemaining * 100) / 100
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
