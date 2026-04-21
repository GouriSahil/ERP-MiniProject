(function() {
    'use strict';

    angular
        .module('erpApp')
        .factory('DashboardService', DashboardService);

    DashboardService.$inject = ['$http', '$q', 'APP_CONFIG'];

    function DashboardService($http, $q, APP_CONFIG) {
        var service = {
            getOverview: getOverview,
            approveUser: approveUser,
            rejectUser: rejectUser
        };

        return service;

        function getOverview(currentUser, customDateFrom, customDateTo) {
            var today = new Date();
            var dateFrom = customDateFrom ? new Date(customDateFrom).toISOString() : new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
            var dateTo = customDateTo ? new Date(customDateTo).toISOString() : new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30).toISOString();

            var requests = {
                students: safeGet(APP_CONFIG.API_BASE_URL + '/students', { page: 1, limit: 1 }),
                faculty: safeGet(APP_CONFIG.API_BASE_URL + '/faculty', { page: 1, limit: 1 }),
                courses: safeGet(APP_CONFIG.API_BASE_URL + '/courses', { page: 1, limit: 1 }),
                departments: safeGet(APP_CONFIG.API_BASE_URL + '/departments', { page: 1, limit: 1 }),
                pendingUsers: safeGet(APP_CONFIG.API_BASE_URL + '/users/pending', { page: 1, limit: 5 }),
                sessions: safeGet(APP_CONFIG.API_BASE_URL + '/sessions', { page: 1, limit: 25, dateFrom: dateFrom, dateTo: dateTo }),
                enrollmentTrends: safeGet(APP_CONFIG.API_BASE_URL + '/reports/charts/enrollment-trends', {}),
                attendanceStats: safeGet(APP_CONFIG.API_BASE_URL + '/reports/charts/attendance-stats', {}),
                coursePopularity: safeGet(APP_CONFIG.API_BASE_URL + '/reports/charts/course-popularity', {}),
                audit: safeGet(APP_CONFIG.API_BASE_URL + '/audit', { page: 1, limit: 8, sortBy: 'occurredAt', sortOrder: 'desc' })
            };

            return $q.all(requests).then(function(results) {
                return normalizeOverview(results, currentUser);
            });
        }

        function normalizeOverview(results, currentUser) {
            var role = currentUser && currentUser.role ? String(currentUser.role).toLowerCase() : '';
            var studentTotal = extractPaginationTotal(results.students);
            var facultyTotal = extractPaginationTotal(results.faculty);
            var courseTotal = extractPaginationTotal(results.courses);
            var departmentTotal = extractPaginationTotal(results.departments);

            var pendingApproval = extractPendingUsers(results.pendingUsers);
            var upcomingSessions = extractUpcomingSessions(results.sessions);
            var recentActivity = extractAuditLogs(results.audit);

            var charts = {
                enrollmentTrends: extractCharts(results.enrollmentTrends),
                attendanceStats: extractCharts(results.attendanceStats),
                coursePopularity: extractCharts(results.coursePopularity)
            };

            return {
                currentUser: currentUser || null,
                counts: {
                    students: studentTotal,
                    faculty: facultyTotal,
                    courses: courseTotal,
                    departments: departmentTotal
                },
                pendingApprovals: pendingApproval,
                upcomingSessions: upcomingSessions,
                recentActivity: recentActivity,
                charts: charts,
                roleStats: buildRoleStats(role, {
                    students: studentTotal,
                    faculty: facultyTotal,
                    courses: courseTotal,
                    departments: departmentTotal
                }, pendingApproval, upcomingSessions, charts),
                capabilities: {
                    canSeeApprovals: !pendingApproval.blocked,
                    canSeeSessions: !upcomingSessions.blocked,
                    canSeeReports: !(charts.enrollmentTrends.blocked && charts.attendanceStats.blocked),
                    canSeeAudit: !recentActivity.blocked
                }
            };
        }

        function buildRoleStats(role, counts, pendingApproval, upcomingSessions, charts) {
            var defaultStats = [
                makeStatCard('Total Students', counts.students, 'fas fa-user-graduate'),
                makeStatCard('Total Faculty', counts.faculty, 'fas fa-chalkboard-teacher'),
                makeStatCard('Courses', counts.courses, 'fas fa-book'),
                makeStatCard('Departments', counts.departments, 'fas fa-building')
            ];

            if (role === 'student') {
                return [
                    makeStatCard('My Attendance', getAverageAttendance(charts.attendanceStats), 'fas fa-chart-pie', '%'),
                    makeStatCard('Upcoming Sessions', getUpcomingCount(upcomingSessions), 'fas fa-calendar-check'),
                    makeStatCard('My Courses', counts.courses, 'fas fa-book-open'),
                    makeStatCard('Enrollment Trend', getLatestEnrollmentCount(charts.enrollmentTrends), 'fas fa-chart-line')
                ];
            }

            if (role === 'faculty') {
                return [
                    makeStatCard('My Students', counts.students, 'fas fa-user-graduate'),
                    makeStatCard('Upcoming Classes', getUpcomingCount(upcomingSessions), 'fas fa-calendar-day'),
                    makeStatCard('Attendance Avg', getAverageAttendance(charts.attendanceStats), 'fas fa-clipboard-check', '%'),
                    makeStatCard('My Courses', counts.courses, 'fas fa-book-open')
                ];
            }

            if (role === 'dept_head') {
                return [
                    makeStatCard('Department Students', counts.students, 'fas fa-user-graduate'),
                    makeStatCard('Department Faculty', counts.faculty, 'fas fa-chalkboard-teacher'),
                    makeStatCard('Department Courses', counts.courses, 'fas fa-book'),
                    makeStatCard('Pending Approvals', pendingApproval.total, 'fas fa-user-check')
                ];
            }

            return defaultStats;
        }

        function makeStatCard(label, value, icon, suffix) {
            return {
                label: label,
                value: value,
                icon: icon,
                suffix: suffix || ''
            };
        }

        function getUpcomingCount(upcomingSessions) {
            if (!upcomingSessions || upcomingSessions.blocked) return null;
            return (upcomingSessions.sessions || []).length;
        }

        function getLatestEnrollmentCount(enrollmentTrends) {
            if (!enrollmentTrends || enrollmentTrends.blocked) return null;
            var points = enrollmentTrends.data || [];
            if (!points.length) return null;
            var lastPoint = points[points.length - 1];
            return (lastPoint && typeof lastPoint.value === 'number') ? lastPoint.value : null;
        }

        function getAverageAttendance(attendanceStats) {
            if (!attendanceStats || attendanceStats.blocked) return null;
            var rows = attendanceStats.data || [];
            if (!rows.length) return null;

            var total = 0;
            var count = 0;

            rows.forEach(function(row) {
                if (row && typeof row.percentage === 'number') {
                    total += row.percentage;
                    count += 1;
                }
            });

            if (count === 0) return null;
            return Math.round(total / count);
        }

        function extractPaginationTotal(resp) {
            if (!resp || resp.blocked) return null;
            var pagination = resp.data && resp.data.pagination;
            if (pagination && typeof pagination.total === 'number') return pagination.total;
            return null;
        }

        function extractPendingUsers(resp) {
            if (!resp) return { blocked: true, users: [], total: null };
            if (resp.blocked) return { blocked: true, users: [], total: null, reason: resp.reason };

            var data = resp.data && resp.data.data;
            var users = (data && data.users) || [];
            var summary = (data && data.summary) || {};
            var total = typeof summary.totalPending === 'number' ? summary.totalPending : null;

            return { blocked: false, users: users, total: total };
        }

        function extractUpcomingSessions(resp) {
            if (!resp) return { blocked: true, sessions: [] };
            if (resp.blocked) return { blocked: true, sessions: [], reason: resp.reason };

            var sessions = (resp.data && resp.data.data) || [];

            // API sorts desc; for "upcoming" sort asc by date+startTime, then take first 6
            var sorted = sessions.slice().sort(function(a, b) {
                var aDate = new Date(a.date || 0).getTime();
                var bDate = new Date(b.date || 0).getTime();
                if (aDate !== bDate) return aDate - bDate;
                return String(a.startTime || '').localeCompare(String(b.startTime || ''));
            });

            return { blocked: false, sessions: sorted.slice(0, 6) };
        }

        function extractCharts(resp) {
            if (!resp) return { blocked: true, data: [] };
            if (resp.blocked) return { blocked: true, data: [], reason: resp.reason };

            var payload = resp.data && resp.data.data;
            var data = (payload && payload.data) || [];
            return { blocked: false, data: data };
        }

        function extractAuditLogs(resp) {
            if (!resp) return { blocked: true, logs: [] };
            if (resp.blocked) return { blocked: true, logs: [], reason: resp.reason };
            var logs = (resp.data && resp.data.data) || [];
            return { blocked: false, logs: logs };
        }

        function safeGet(url, params) {
            return $http.get(url, { params: params })
                .then(function(response) {
                    return { blocked: false, data: response.data };
                })
                .catch(function(error) {
                    // Permission issues are expected depending on role (403/401)
                    var status = error && error.status;
                    if (status === 401 || status === 403) {
                        return { blocked: true, reason: 'forbidden', status: status };
                    }
                    return $q.reject(normalizeHttpError(error));
                });
        }

        function normalizeHttpError(error) {
            var err = {
                status: (error && error.status) || 500,
                data: { message: 'An unexpected error occurred' }
            };

            if (error && error.data) {
                if (error.data.message) err.data.message = error.data.message;
                else if (error.data.error) err.data.message = error.data.error;
                else if (typeof error.data === 'string') err.data.message = error.data;
            } else if (error && error.message) {
                err.data.message = error.message;
            }

            return err;
        }

        function approveUser(userId) {
            if (!userId) return $q.reject({ data: { message: 'User ID is required' }, status: 400 });
            return $http.post(APP_CONFIG.API_BASE_URL + '/users/' + userId + '/approve')
                .then(function(response) {
                    return response.data;
                })
                .catch(function(error) {
                    return $q.reject(normalizeHttpError(error));
                });
        }

        function rejectUser(userId, reason) {
            if (!userId) return $q.reject({ data: { message: 'User ID is required' }, status: 400 });
            return $http.post(APP_CONFIG.API_BASE_URL + '/users/' + userId + '/reject', { reason: reason || '' })
                .then(function(response) {
                    return response.data;
                })
                .catch(function(error) {
                    return $q.reject(normalizeHttpError(error));
                });
        }
    }
})();

