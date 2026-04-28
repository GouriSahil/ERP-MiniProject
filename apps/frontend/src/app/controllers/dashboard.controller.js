(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('DashboardController', DashboardController);

    DashboardController.$inject = ['$scope', '$location', '$cookies', 'AuthService', 'DashboardService', '$timeout'];

    function DashboardController($scope, $location, $cookies, AuthService, DashboardService, $timeout) {
        var vm = this;
        
        vm.currentUser = null;
        vm.isLoading = true;
        vm.loadError = null;

        vm.counts = { students: null, faculty: null, courses: null, departments: null };
        vm.roleStats = [];
        vm.pendingApprovals = { blocked: true, users: [], total: null };
        vm.upcomingSessions = { blocked: true, sessions: [] };
        vm.recentActivity = { blocked: true, logs: [] };
        vm.charts = { enrollmentTrends: { blocked: true, data: [] }, attendanceStats: { blocked: true, data: [] } };
        vm.capabilities = {};
        vm.quickActions = [];
        vm.isApprovalsBusy = false;
        vm.quickActionState = { attendance: false, enrollment: false };
        
        vm.showChangePasswordForm = false;
        vm.changePasswordData = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        };
        vm.changePasswordStatus = null;
        vm.changePasswordMessage = '';
        
        vm.activeTab = $location.path() === '/settings' ? 'settings' : 'profile';
        vm.accordionState = {
            notifications: true,
            theme: false,
            language: false
        };

        vm.toggleAccordion = function(section) {
            vm.accordionState[section] = !vm.accordionState[section];
        };
        
        vm.dateFilter = {
            from: new Date(),
            to: new Date()
        };
        // Initialize 'to' date to 30 days from now
        vm.dateFilter.to.setDate(vm.dateFilter.to.getDate() + 30);

        vm.refresh = function() {
            loadDashboardData();
        };

        init();

        function init() {
            // Get current user
            vm.currentUser = AuthService.getCurrentUser();
            
            if (!vm.currentUser) {
                $location.path('/login');
                return;
            }
            
            loadDashboardData();
            buildQuickActions();
        }

        function loadDashboardData() {
            vm.isLoading = true;
            vm.loadError = null;

            DashboardService.getOverview(vm.currentUser, vm.dateFilter.from, vm.dateFilter.to)
                .then(function(overview) {
                    vm.isLoading = false;
                    vm.counts = overview.counts;
                    vm.pendingApprovals = overview.pendingApprovals;
                    vm.upcomingSessions = overview.upcomingSessions;
                    vm.recentActivity = overview.recentActivity;
                    vm.charts = overview.charts;
                    vm.roleStats = overview.roleStats || [];
                    vm.capabilities = overview.capabilities;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.loadError = error && error.data && error.data.message ? error.data.message : 'Failed to load dashboard';
                });
        }

        function buildQuickActions() {
            var defaultActions = [
                { label: 'Departments', icon: 'fas fa-building', path: '/departments' },
                { label: 'Courses', icon: 'fas fa-book', path: '/courses' },
                { label: 'Students', icon: 'fas fa-user-graduate', path: '/students' },
                { label: 'Faculty', icon: 'fas fa-chalkboard-teacher', path: '/faculty' },
                { label: 'Sessions', icon: 'fas fa-calendar-check', path: '/sessions' },
                { label: 'Reports', icon: 'fas fa-chart-bar', path: '/reports' }
            ];

            var role = (vm.currentUser && vm.currentUser.role) ? String(vm.currentUser.role).toLowerCase() : '';
            if (role === 'student') {
                vm.quickActions = [
                    { label: 'My Courses', icon: 'fas fa-book-open', path: '/courses' },
                    { label: 'My Attendance', icon: 'fas fa-clipboard-check', path: '/attendance' },
                    { label: 'Enrollments', icon: 'fas fa-layer-group', path: '/enrollments' },
                    { label: 'Sessions', icon: 'fas fa-calendar-check', path: '/sessions' },
                    { label: 'Reports', icon: 'fas fa-chart-bar', path: '/reports' },
                    { label: 'Profile', icon: 'fas fa-user-circle', path: '/profile' }
                ];
                return;
            }

            if (role === 'faculty') {
                vm.quickActions = [
                    { label: 'My Classes', icon: 'fas fa-chalkboard-teacher', path: '/sessions' },
                    { label: 'Attendance', icon: 'fas fa-clipboard-check', path: '/attendance' },
                    { label: 'Students', icon: 'fas fa-user-graduate', path: '/students' },
                    { label: 'Courses', icon: 'fas fa-book-open', path: '/courses' },
                    { label: 'Reports', icon: 'fas fa-chart-bar', path: '/reports' },
                    { label: 'Profile', icon: 'fas fa-user-circle', path: '/profile' }
                ];
                return;
            }

            vm.quickActions = defaultActions;
        }

        vm.getGreeting = function() {
            var hour = new Date().getHours();
            if (hour < 12) return 'Good Morning';
            if (hour < 17) return 'Good Afternoon';
            return 'Good Evening';
        };

        vm.hasPermission = function(permission) {
            // Check if user has specific permission
            // This would be expanded in a real application
            return vm.currentUser && vm.currentUser.role === 'admin';
        };

        vm.navigateTo = function(path) {
            $location.path(path);
        };

        vm.canQuickMarkAttendance = function() {
            var role = (vm.currentUser && vm.currentUser.role) ? String(vm.currentUser.role).toLowerCase() : '';
            return role === 'faculty' || role === 'dept_head' || role === 'admin' || role === 'super_admin' || role === 'admin';
        };

        vm.canQuickEnrollment = function() {
            var role = (vm.currentUser && vm.currentUser.role) ? String(vm.currentUser.role).toLowerCase() : '';
            return role !== 'student';
        };

        vm.quickMarkAttendance = function() {
            if (!vm.canQuickMarkAttendance()) {
                Swal.fire({
                    icon: 'info',
                    title: 'Attendance action unavailable',
                    text: 'Your role does not allow quick attendance marking.'
                });
                return;
            }

            vm.quickActionState.attendance = true;
            $location.search('quickAction', 'mark-attendance');
            $location.search('from', 'dashboard');
            $location.path('/attendance/history');
        };

        vm.quickCreateEnrollment = function() {
            if (!vm.canQuickEnrollment()) {
                Swal.fire({
                    icon: 'info',
                    title: 'Enrollment action unavailable',
                    text: 'Your role does not allow quick enrollments.'
                });
                return;
            }

            vm.quickActionState.enrollment = true;
            $location.search('quickAction', 'create-enrollment');
            $location.search('from', 'dashboard');
            $location.path('/enrollments/bulk');
        };

        vm.approvePendingUser = function(user) {
            if (!user || !user._id || vm.isApprovalsBusy) return;
            vm.isApprovalsBusy = true;

            DashboardService.approveUser(user._id)
                .then(function() {
                    vm.isApprovalsBusy = false;
                    // Refresh approvals + counts quickly
                    loadDashboardData();
                })
                .catch(function(error) {
                    vm.isApprovalsBusy = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Approve failed',
                        text: (error && error.data && error.data.message) ? error.data.message : 'Could not approve user'
                    });
                });
        };

        vm.rejectPendingUser = function(user) {
            if (!user || !user._id || vm.isApprovalsBusy) return;

            Swal.fire({
                title: 'Reject user?',
                input: 'text',
                inputLabel: 'Reason (optional)',
                inputPlaceholder: 'Enter a reason for rejection',
                showCancelButton: true,
                confirmButtonText: 'Reject',
                confirmButtonColor: '#ef4444'
            }).then(function(result) {
                if (!result.isConfirmed) return;

                vm.isApprovalsBusy = true;
                DashboardService.rejectUser(user._id, result.value || '')
                    .then(function() {
                        vm.isApprovalsBusy = false;
                        loadDashboardData();
                    })
                    .catch(function(error) {
                        vm.isApprovalsBusy = false;
                        Swal.fire({
                            icon: 'error',
                            title: 'Reject failed',
                            text: (error && error.data && error.data.message) ? error.data.message : 'Could not reject user'
                        });
                    });
            });
        };

        vm.formatDate = function(dateValue) {
            if (!dateValue) return '';
            var d = new Date(dateValue);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        };

        vm.formatTimeRange = function(startTime, endTime) {
            if (!startTime && !endTime) return '';
            if (startTime && endTime) return startTime + ' - ' + endTime;
            return startTime || endTime;
        };

        vm.getBarWidth = function(value, maxValue) {
            var v = Number(value) || 0;
            var max = Number(maxValue) || 0;
            if (max <= 0) return '0%';
            var pct = Math.max(0, Math.min(100, Math.round((v / max) * 100)));
            return pct + '%';
        };

        vm.getChartColor = function(index) {
            var colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6', '#f43f5e', '#3b82f6'];
            return colors[index % colors.length];
        };

        vm.getPieGradient = function(data) {
            if (!data || data.length === 0) return 'transparent 0% 100%';
            
            var total = 0;
            data.forEach(function(d) { total += (Number(d.value) || 0); });
            
            if (total === 0) return 'var(--dash-surface) 0% 100%';

            var gradientString = [];
            var currentPct = 0;
            
            for (var i = 0; i < data.length; i++) {
                var value = Number(data[i].value) || 0;
                var pct = (value / total) * 100;
                var color = vm.getChartColor(i);
                
                gradientString.push(color + ' ' + currentPct + '% ' + (currentPct + pct) + '%');
                currentPct += pct;
            }
            
            return gradientString.join(', ');
        };

        vm.shouldShowSection = function(section) {
            var role = (vm.currentUser && vm.currentUser.role) ? String(vm.currentUser.role).toLowerCase() : '';
            if (role === 'student') {
                return section !== 'pendingApprovals' && section !== 'recentActivity';
            }
            if (role === 'faculty') {
                return section !== 'pendingApprovals';
            }
            return true;
        };

        vm.logout = function() {
            AuthService.logout().then(function() {
                $location.path('/login');
            }).catch(function() {
                $location.path('/login');
            });
        };

        vm.toggleChangePassword = function() {
            vm.showChangePasswordForm = !vm.showChangePasswordForm;
            // Reset form on toggle
            if (!vm.showChangePasswordForm) {
                vm.changePasswordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
                vm.changePasswordStatus = null;
            }
        };

        vm.changePassword = function() {
            vm.changePasswordStatus = null;
            
            if (!vm.changePasswordData.currentPassword || !vm.changePasswordData.newPassword || !vm.changePasswordData.confirmPassword) {
                vm.changePasswordStatus = 'error';
                vm.changePasswordMessage = 'All fields are required';
                return;
            }

            if (vm.changePasswordData.newPassword !== vm.changePasswordData.confirmPassword) {
                vm.changePasswordStatus = 'error';
                vm.changePasswordMessage = 'New passwords do not match';
                return;
            }

            if (vm.changePasswordData.newPassword.length < 8) {
                vm.changePasswordStatus = 'error';
                vm.changePasswordMessage = 'New password must be at least 8 characters';
                return;
            }

            AuthService.changePassword(vm.changePasswordData.currentPassword, vm.changePasswordData.newPassword)
                .then(function() {
                    vm.changePasswordStatus = 'success';
                    vm.changePasswordMessage = 'Password updated successfully';
                    vm.changePasswordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
                    
                    $timeout(function() {
                        vm.showChangePasswordForm = false;
                        vm.changePasswordStatus = null;
                    }, 3000);
                })
                .catch(function(error) {
                    vm.changePasswordStatus = 'error';
                    vm.changePasswordMessage = error.data?.message || error.data?.error || 'Failed to update password';
                });
        };
    }
})();
