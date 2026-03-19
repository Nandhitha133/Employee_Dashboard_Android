// Service layer for Policy operations
// This encapsulates all database logic for policies
const mongoose = require('mongoose');
const Policy = require('../models/Policy');

class PolicyService {
    /**
     * Get all policies
     */
    async getAllPolicies() {
        try {
            const policies = await Policy.find({}).sort({ updatedAt: -1 }).lean();
            return { success: true, data: policies };
        } catch (error) {
            console.error('PolicyService.getAllPolicies Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a specific policy by policyId
     */
    async getPolicyById(policyId) {
        try {
            // Try both MongoDB _id and the custom policyId field
            let policy;
            if (mongoose.Types.ObjectId.isValid(policyId)) {
                policy = await Policy.findById(policyId).lean();
            }

            if (!policy) {
                policy = await Policy.findOne({
                    policyId: new RegExp(`^${policyId}$`, 'i')
                }).lean();
            }

            if (policy) {
                return { success: true, data: policy, found: true };
            } else {
                return { success: true, data: null, found: false, message: `No policy found with ID ${policyId}` };
            }
        } catch (error) {
            console.error('PolicyService.getPolicyById Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a specific policy by exact title (case-insensitive)
     */
    async getPolicyByTitle(title) {
        try {
            const regex = new RegExp(`^${title}$`, 'i');
            const policy = await Policy.findOne({
                $or: [{ title: regex }, { policyName: regex }]
            }).lean();

            if (policy) {
                return { success: true, data: policy, found: true };
            } else {
                return { success: true, data: null, found: false };
            }
        } catch (error) {
            console.error('PolicyService.getPolicyByTitle Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Search policies by keyword
     */
    async searchPolicies(keyword) {
        try {
            // Support both single keyword and array of keywords
            const searchPattern = Array.isArray(keyword) ? keyword.join('|') : keyword;
            const regex = new RegExp(searchPattern, 'i');

            const policies = await Policy.find({
                $or: [
                    { policyName: regex },
                    { title: regex },
                    { policyType: regex },
                    { content: regex }
                ]
            }).lean();

            return { success: true, data: policies };
        } catch (error) {
            console.error('PolicyService.searchPolicies Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a new policy
     */
    async createPolicy(policyData) {
        try {
            const created = await Policy.create(policyData);
            return { success: true, data: created };
        } catch (error) {
            console.error('PolicyService.createPolicy Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update a policy
     */
    async updatePolicy(id, policyData) {
        try {
            const updated = await Policy.findByIdAndUpdate(id, policyData, { new: true, runValidators: true });
            if (!updated) {
                return { success: false, error: 'Policy not found' };
            }
            return { success: true, data: updated };
        } catch (error) {
            console.error('PolicyService.updatePolicy Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a policy
     */
    async deletePolicy(id) {
        try {
            const removed = await Policy.findByIdAndDelete(id);
            if (!removed) {
                return { success: false, error: 'Policy not found' };
            }
            return { success: true, data: removed };
        } catch (error) {
            console.error('PolicyService.deletePolicy Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new PolicyService();
