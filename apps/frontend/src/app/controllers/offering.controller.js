(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('OfferingController', OfferingController);

    OfferingController.$inject = ['$scope', '$location', '$routeParams', 'AuthService', 'OfferingService', 'CourseService', 'TermService'];

    function OfferingController($scope, $location, $routeParams, AuthService, OfferingService, CourseService, TermService) {
        var vm = this;

        vm.isLoading = true;
        vm.isSaving = false;
        vm.error = null;
        vm.offerings = [];
        vm.courses = [];
        vm.terms = [];
        
        vm.pagination = {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
        };

        vm.offering = {
            courseId: '',
            termId: '',
            maxCapacity: 60,
            schedule: {
                days: [],
                startTime: '',
                endTime: ''
            },
            room: '',
            status: 'active'
        };

        vm.searchQuery = '';
        vm.filterTerm = '';
        
        vm.daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        vm.search = search;
        vm.changePage = changePage;
        vm.save = save;
        vm.confirmDelete = confirmDelete;
        vm.toggleDay = toggleDay;
        vm.navigateBack = navigateBack;

        init();

        function init() {
            var path = $location.path();
            if (path.indexOf('/course-offerings/create') !== -1) {
                loadDependencies();
            } else if ($routeParams.id) {
                loadDependencies().then(function() {
                    loadOffering($routeParams.id);
                });
            } else {
                loadDependencies().then(function() {
                    loadOfferings();
                });
            }
        }

        function loadDependencies() {
            var p1 = CourseService.list({ limit: 1000 }).then(function(res) {
                vm.courses = res.data || [];
            });
            var p2 = TermService.list({ limit: 100 }).then(function(res) {
                vm.terms = res.data || [];
            });
            return Promise.all([p1, p2]).then(function() {
                vm.isLoading = false;
                $scope.$applyAsync();
            });
        }

        function loadOfferings() {
            vm.isLoading = true;
            var params = {
                page: vm.pagination.page,
                limit: vm.pagination.limit
            };
            
            if (vm.filterTerm) params.termId = vm.filterTerm;

            OfferingService.list(params)
                .then(function(response) {
                    vm.offerings = response.data || [];
                    if (response.pagination) {
                        vm.pagination.total = response.pagination.total;
                        vm.pagination.totalPages = response.pagination.totalPages;
                        vm.pagination.page = response.pagination.page;
                    }
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = error.data && error.data.message ? error.data.message : 'Failed to load offerings';
                });
        }

        function search() {
            vm.pagination.page = 1;
            loadOfferings();
        }

        function changePage(newPage) {
            if (newPage < 1 || newPage > vm.pagination.totalPages) return;
            vm.pagination.page = newPage;
            loadOfferings();
        }

        function parseTime(timeStr) {
            if (!timeStr) return null;
            var parts = timeStr.split(':');
            var d = new Date();
            d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
            return d;
        }

        function formatTime(dateObj) {
            if (!dateObj) return '';
            if (typeof dateObj === 'string') return dateObj;
            var h = ('0' + dateObj.getHours()).slice(-2);
            var m = ('0' + dateObj.getMinutes()).slice(-2);
            return h + ':' + m;
        }

        function loadOffering(id) {
            vm.isLoading = true;
            OfferingService.getById(id)
                .then(function(response) {
                    var data = response.data || {};
                    vm.offering = {
                        courseId: data.courseId ? data.courseId._id : '',
                        termId: data.termId ? data.termId._id : '',
                        maxCapacity: data.capacity || 60,
                        schedule: data.schedule || { days: [], startTime: '', endTime: '' },
                        room: data.schedule && data.schedule.location ? data.schedule.location : '',
                        status: data.status || 'active'
                    };
                    if (!vm.offering.schedule.days) vm.offering.schedule.days = [];
                    
                    if (vm.offering.schedule.startTime && typeof vm.offering.schedule.startTime === 'string') {
                        vm.offering.schedule.startTime = parseTime(vm.offering.schedule.startTime);
                    }
                    if (vm.offering.schedule.endTime && typeof vm.offering.schedule.endTime === 'string') {
                        vm.offering.schedule.endTime = parseTime(vm.offering.schedule.endTime);
                    }
                    
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = error.data && error.data.message ? error.data.message : 'Failed to load offering details';
                });
        }

        function toggleDay(day) {
            var idx = vm.offering.schedule.days.indexOf(day);
            if (idx > -1) {
                vm.offering.schedule.days.splice(idx, 1);
            } else {
                vm.offering.schedule.days.push(day);
            }
        }

        function save() {
            if (vm.isSaving) return;
            vm.isSaving = true;
            vm.error = null;

            // map fields for API
            var payload = angular.copy(vm.offering);
            payload.capacity = payload.maxCapacity;
            
            if (payload.schedule) {
                payload.schedule.location = payload.room;
                if (payload.schedule.startTime) payload.schedule.startTime = formatTime(payload.schedule.startTime);
                if (payload.schedule.endTime) payload.schedule.endTime = formatTime(payload.schedule.endTime);
            }
            
            delete payload.maxCapacity;
            delete payload.room;

            var request;
            if ($routeParams.id) {
                request = OfferingService.update($routeParams.id, payload);
            } else {
                request = OfferingService.create(payload);
            }

            request
                .then(function() {
                    vm.isSaving = false;
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: 'Course offering saved successfully.',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#0f1425',
                        color: '#F5F7FF'
                    });
                    $location.path('/course-offerings');
                })
                .catch(function(error) {
                    vm.isSaving = false;
                    var errorMessage = 'Failed to save offering';
                    if (error.data) {
                        if (error.data.message) errorMessage = error.data.message;
                        else if (error.data.error) {
                            errorMessage = error.data.error;
                            if (error.data.details && error.data.details.length) {
                                errorMessage += ': ' + error.data.details.map(function(e) { return e.msg; }).join(', ');
                            }
                        }
                    }
                    vm.error = errorMessage;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: vm.error,
                        background: '#0f1425',
                        color: '#F5F7FF'
                    });
                });
        }

        function confirmDelete(id) {
            Swal.fire({
                title: 'Delete Offering?',
                text: 'Are you sure you want to delete this course offering?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Delete',
                confirmButtonColor: '#ef4444',
                background: '#0f1425',
                color: '#F5F7FF'
            }).then(function(result) {
                if (result.isConfirmed) {
                    OfferingService.remove(id)
                        .then(function() {
                            Swal.fire({
                                icon: 'success',
                                title: 'Deleted',
                                text: 'Offering deleted successfully.',
                                timer: 2000,
                                showConfirmButton: false,
                                background: '#0f1425',
                                color: '#F5F7FF'
                            });
                            loadOfferings();
                        })
                        .catch(function(error) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: error.data && error.data.message ? error.data.message : 'Failed to delete offering.',
                                background: '#0f1425',
                                color: '#F5F7FF'
                            });
                        });
                }
            });
        }

        function navigateBack() {
            $location.path('/course-offerings');
        }
    }
})();
