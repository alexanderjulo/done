var Task = Backbone.Model.extend({

    url: function() {
        if (this.get('id')) {
            return '/api/tasks/' + this.get('id')
        } else {
            return '/api/tasks/'
        }
    },

    defaults: {
        name: null,
        created: null,
        due: null,
        completed: null,
        project_id: null,
        area_id: null,
        recurring: false
    },

    completed: function() {
        day = moment(new Date()).format('YYYY-MM-DD');
        this.set({completed: day});
        this.save();
    }

});

var TaskView = Backbone.View.extend({

    tagName: 'li',

    className: 'task',

    events: {
        'click': 'activate'
    },

    template: _.template($('#task-template').html()),

    initialize: function(options) {
        this.tasksview = options.tasksview;
        this.listenTo(this.model, 'change', this.render);
        this.listenTo(this.model, 'remove', this.remove);
        this.listenTo(this.model, 'destroy', this.remove);
        // no dragging for now..
        // this.$el.draggable({revert: 'invalid'});
        // this.$el.data('model', this.model);
    },

    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        if (this.tasksview.activeid == this.model.get('id')) {
            this.$el.addClass('active');
        }
        return this;
    },

    activate: function(event) {
        this.tasksview.activeid = this.model.get('id');
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if ($(window).width() < 768 && !app.infoVisible()) {
            app.toggleInfo();
        }
        this.tasksview.$('li').removeClass('active');
        this.$el.addClass('active');
        app.infoview.show(this.model);
    },

});

var Tasks = Backbone.Collection.extend({

    model: Task,

    url: '/api/tasks/'

});

var TemporaryTasks = Backbone.Collection.extend({
    model: Task

});

var TasksView = Backbone.View.extend({

    el: '#tasks',

    events: {
        'click #tasks-edit-project': 'toggleProjectEdit',
        'click #tasks-save-project': 'saveProject',
        'click #tasks-delete-project': 'deleteProject',
        'click #tasks-show-completed': 'toggleCompleted',
        'click #tasks-hide-completed': 'toggleCompleted',
        'click #task-submit': 'submitOnClick',
        'keypress #task-input': 'submitOnEnter'
    },

    filter: null,

    showCompleted: false,

    selectedCollection: new TemporaryTasks({}),

    template: _.template($('#tasks-template').html()),

    initialize: function(options) {
        this.app = options.app;
        this.render();
        this.listenTo(this.collection, 'add', this.add);
        this.listenTo(this.collection, 'change', this.render);
    },

    render: function() {
        // renders the tasksview and spawns all necessary taskview children
        // set some default values
        this.project = null;
        this.area = null;

        // check what kind of a filter we have
        if (_.isFunction(this.filter)) {
            // if it is a function, we will use .filter() to check for matches
            tasks = this.collection.filter(this.filter);
        } else if (_.isNull(this.filter)) {
            // if there is no filter, we will just use all models
            tasks = this.collection.models;
        } else {
            // in any other case we assume it is an object and filter with .where()
            tasks = this.collection.where(this.filter);

            // as we have an object, we might be displaying a single project
            // or area, and would want to fetch some info to display it.
            // so let's check for that. If this is the case, we should
            // only have one criteria ...
            if (_.size(this.filter) == 1) {
                if (this.filter.project_id) {
                    // ... and that is either project_id ...
                    this.project = this.app.projects.get(this.filter.project_id)
                } else if (this.filter.area_id) {
                    // ...or area_id
                    this.area = this.app.areas.get(this.filter.area_id)
                }
            }
        }
        
        // a temporary backbone collection for the selected tasks
        this.selectedCollection.reset(tasks);

        // getting some metadata about the selected tasks
        total = this.selectedCollection.length;
        open = this.selectedCollection.where({completed: null}).length;
        completed = this.selectedCollection.filter(function(task) {
            return task.get('completed') != null
        }).length;

        // render the template with the metadata into the html
        this.$el.html(this.template({
            name: this.name,
            project: this.project ? this.project.toJSON() : null,
            area: this.area ? this.area.toJSON() : null,
            areas: this.app.areas.toJSON(),
            showCompleted: this.showCompleted,
            total: total,
            open: open,
            completed: completed
        }));
        // spawn all the children..
        
        this.selectedCollection.each(function(task) {
            this.add(task);
        }, this);
        return this;
    },

    select: function(name, filter) {
        this.name = name;
        this.filter = filter;
        this.render();
    },

    add: function(task) {
        view = new TaskView({model: task, tasksview: this});
        view.render();
        if (task.get('completed')) {
            this.$('#tasks-list-completed').prepend(view.el);
        } else {
            this.$('#tasks-list').prepend(view.el);
        }
        
    },

    toggleCompleted: function(event) {
        event.preventDefault();
        this.showCompleted = !this.showCompleted
        this.$('#tasks-show-completed').toggleClass('hidden');
        this.$('#tasks-completed').toggleClass('hidden');
    },

    submit: function() {
        input = this.$('#task-input').val();
        if (input == '') {
            return;
        }
        this.$('#task-input').val('');
        task = new Task({name: input, created: moment(new Date()).format('YYYY-MM-DD')});
        if (!_.isFunction(this.filter)) {
            task.set(this.filter);
        }
        this.collection.create(task);
    },

    submitOnClick: function(event) {
        event.preventDefault();
        this.submit();
    },

    submitOnEnter: function(event) {
        if (event.keyCode != 13) return;
        event.preventDefault();
        this.submit();
    },

    toggleProjectEdit: function(event) {
        event.preventDefault();
        this.$('#tasks-edit-project').toggle();
        this.$('.info').toggle();
        this.$('.editor').toggle();
    },

    saveProject: function(event) {
        event.preventDefault();
        area_id = this.$('#tasks-edit-project-area option:selected').val();
        this.project.set({
            name: this.$('#tasks-edit-project-name').val(),
            due: this.$('#tasks-edit-project-due').val(),
            area_id: area_id == 0 ? null : area_id
        });
        this.project.save();
        // little adjustments to the title, as the menuview won't enforce this
        // until you click the entry again..
        this.name = this.project.get('name');
        this.render();
    },

    deleteProject: function(event) {
        event.preventDefault();
        this.project.destroy();
        this.select(null);
    }

});

var Project = Backbone.Model.extend({

    defaults: {
        id: null,
        name: null
    }

});

var Projects = Backbone.Collection.extend({

    model: Project,

    url: '/api/projects/'

});

var Area = Backbone.Model.extend({

    defaults: {
        id: null,
        name: null
    }

});

var Areas = Backbone.Collection.extend({

    model: Area,

    url: '/api/areas/'

});

var InfoView = Backbone.View.extend({

    el: '#info',

    model: null,

    events: {
        'dblclick #info-name .display': 'editName',
        'keypress #info-name .editor': 'submitNameOnEnter',
        'click #info-completed': 'completed',
        'click #info-postpone': 'postpone',
        'click #info-delete': 'delete',
        'change #info-due': 'due',
        'change #info-project': 'project',
        'change #info-area': 'area'
    },

    template: _.template($('#info-template').html()),

    defaultTemplate: _.template($('#info-default-template').html()),

    initialize: function(options) {
        this.render();
        this.projects = options.projects;
        this.areas = options.areas;
    },

    render: function() {
        if (this.model) {
            data = this.model.toJSON();
            data.projects = this.projects.toJSON();
            data.areas = this.areas.toJSON();
            this.$el.html(this.template(data));
        } else {
            this.$el.html(this.defaultTemplate());
        }
        return this;
    },

    show: function(task) {
        this.model = task;
        this.render();
        if (this.model) {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'remove', this.render);
            this.listenTo(this.model, 'destroy', this.render);
        }
    },

    editName: function() {
        this.$('#info-name .display').toggle();
        this.$('#info-name .editor').toggle();
    },

    submitNameOnEnter: function(event) {
        if (event.keyCode != 13) return;
        event.preventDefault();
        name = this.$('#info-name .editor').val();
        this.model.set({name: name});
        this.model.save();
    },

    completed: function(event) {
        event.preventDefault();
        this.model.completed();
    },

    postpone: function(event) {
        event.preventDefault();
        date = moment(this.model.get('due'), 'YYYY-MM-DD');
        date.add('days', 1);
        this.model.set({'due': date.format('YYYY-MM-DD')});
        this.model.save();
    },

    delete: function(event) {
        event.preventDefault();
        model = this.model;
        this.model = null;
        model.destroy();
    },

    due: function() {
        date = this.$('#info-due').val()
        this.model.set({due: date});
        this.model.save();
    },

    project: function() {
        value = this.$('#info-project option:selected').val();
        if (value == 0) {
            this.model.set({project_id: null});  
        } else {
            this.model.set({project_id: value, area_id: null});
        }
        this.model.save();
        app.tasksview.render();
    },

    area: function() {
        value = this.$('#info-area option:selected').val();
        if (value == 0) {
            this.model.set({area_id: null});
            
        } else {
            this.model.set({area_id: value, project_id: null});
        }
        this.model.save();
        app.tasksview.render();
    }

});

var MenuEntryView = Backbone.View.extend({

    tagName: 'li',

    events: {
        'click': 'activate',
        'over': 'over',
        'out': 'out',
        'drop': 'drop'
    },

    template: _.template($('#menu-entry-template').html()),

    initialize: function(options) {
        this.menuview = options.menuview;
        this.filter = options.filter;
        this.name = options.name;
        this.route = options.route;
        if (options.droppable) {
            this.$el.droppable({tolerance: 'pointer'});
        }
        this.$el.data('view', this);
    },

    render: function() {
        this.$el.html(this.template({name: this.name}));
        if (this.menuview.activeroute == this.route) {
            this.$el.addClass('active');
        }
        return this;
    },

    activate: function(event) {
        this.menuview.activeroute = this.route;
        if (event) {
            event.preventDefault();
        }
        if ($(window).width() < 768 && app.menuVisible()) {
            app.toggleMenu();
        }
        app.menuview.$('li').removeClass('active');
        this.$el.addClass('active');
        app.tasksview.select(this.name, this.filter);
        app.router.navigate(this.route);
    },

    over: function() {
        this.$el.addClass('dropping');
    },

    out: function() {
        this.$el.removeClass('dropping');
    },

    drop: function(event, ui) {
        model = $(ui.draggable).data('model');
        model.set(this.filter);
    }

});

var MenuView = Backbone.View.extend({

    el: '#menu',

    template: _.template($('#menu-template').html()),

    events: {
        'click #menu-project-add': 'newProject',
        'click #menu-area-add': 'newArea'
    },

    activeroute: null,

    defaultEntries: [
        {
            name: 'Inbox',
            filter: {
                project_id: null,
                area_id: null
            },
            container: '#menu-incoming',
            route: 'inbox'
        },
        {
            name: 'Today',
            filter: function(task) {
                today = moment(new Date());
                if (!task.get('due')) {
                    return false
                }
                due = moment(task.get('due'), 'YYYY-MM-DD');
                if ((today.isSame(due, 'day') || today.isAfter(due, 'day')) && !task.get('completed'))  {
                    return true
                }
            },
            container: '#menu-focus',
            route: 'today'
        },
        {
            name: 'Next',
            filter: function(task) {
                inaweek = moment(new Date()).add('days', 7);
                due = moment(task.get('due'), 'YYYY-MM-DD');
                if (!task.get('due')) {
                    return false
                }
                if (due.isSame(inaweek, 'day') || inaweek.isAfter(due, 'day')) {
                    return true
                }
            },
            container: '#menu-focus',
            route: 'next'
        },
        {
            name: 'All tasks',
            filter: null,
            container: '#menu-other',
            route: 'all'
        }
    ],

    initialize: function(options) {
        this.projects = options.projects;
        this.areas = options.areas;
        this.listenTo(this.projects, 'add', this.render);
        this.listenTo(this.projects, 'remove', this.render);
        this.listenTo(this.projects, 'change', this.render);
        this.listenTo(this.areas, 'add', this.render);
        this.listenTo(this.areas, 'remove', this.render);
        this.listenTo(this.areas, 'change', this.render);
        this.render();
    },

    render: function() {
        this.$el.html(this.template());
        _.forEach(this.defaultEntries, function(entry) {
            view = new MenuEntryView({
                name: entry.name,
                filter: entry.filter,
                route: entry.route,
                id: 'menu-entry-' + entry.route,
                menuview: this
            });
            this.$(entry.container).append(view.render().el);
        }, this);

        this.projects.each(function(project) {
            view = new MenuEntryView({
                name: project.get('name'),
                filter: {project_id: project.get('id')},
                droppable: true,
                route: 'project/' + project.get('id'),
                id: 'menu-entry-project-' + project.get('id'),
                menuview: this
            });
            this.$('#menu-projects').append(view.render().el);
        }, this);

        this.areas.each(function(area) {
            view = new MenuEntryView({
                name: area.get('name'),
                filter: {area_id: area.get('id')},
                droppable: true,
                route: 'area/' + area.get('id'),
                id: 'menu-entry-area-' + area.get('id'),
                menuview: this
            });
            this.$('#menu-areas').append(view.render().el);
        }, this);

        return this;
    },

    newProject: function(event) {
        event.preventDefault();
        name = prompt("Please enter a name for the project:", '');
        // as chrome has a really ugly bug(?) which causes prompt() abort results
        // that are assigned to a variable to be 'null' (string) instead of null,
        // I have to block 'null' as project name
        if (name != '' && name != null && name != 'null') {
            this.projects.create({name: name});
            this.render();
        }
    },

    newArea: function(event) {
        event.preventDefault();
        name = prompt("Please enter a name for the area:", '');
        // as chrome has a really ugly bug(?) which causes prompt() abort results
        // that are assigned to a variable to be 'null' (string) instead of null,
        // I have to block 'null' as area name
        if (name != '' && name != null && name != 'null') {
            this.areas.create({name: name});
            this.render();
        }
    }

});

var Router = Backbone.Router.extend({
    
    routes: {
        'inbox': 'inbox',
        'today': 'today',
        'next': 'next',
        'project/:project': 'project',
        'area/:area': 'area',
        'all': 'all',
        '*path': 'default'
    },

    goTo: function(route) {
        view = $('#menu-entry-' + route).data('view');
        view.activate();
    },

    inbox: function() {
        this.goTo('inbox');
    },

    today: function() {
        this.goTo('today');
    },

    next: function() {
        this.goTo('next');
    },

    project: function(project_id) {
        this.goTo('project-' + project_id);
    },

    area: function(area_id) {
        this.goTo('area-' + area_id);
    },

    all: function() {
        this.goTo('all');
    },

    default: function() {
        this.today();
    }

})

var App = Backbone.View.extend({

    el: 'body',

    events: {
        'click #menu-button': 'toggleMenu',
        'click #center': 'maybeToggleInfo',
    },

    initialize: function(data) {
        this.tasks = new Tasks();
        this.tasks.reset(data.tasks);
        this.projects = new Projects();
        this.projects.reset(data.projects);
        this.areas = new Areas();
        this.areas.reset(data.areas);
        this.tasksview = new TasksView({collection: this.tasks, app: this});
        this.infoview = new InfoView({
            collection: this.tasks,
            projects: this.projects,
            areas: this.areas
        });
        this.menuview = new MenuView({
            projects: this.projects,
            areas: this.areas
        });
        this.router = new Router({});
    },

    menuVisible: function() {
        return parseInt(this.$('#left').css('left'),10) == 0
    },

    toggleMenu: function() {
        if (this.infoVisible()) {
            this.toggleInfo();
        }
        centerwidth = this.$('#center').outerWidth();
        centerleft = parseInt(this.$('#center').css('left'),10);
        leftwidth = this.$('#left').outerWidth();
        leftleft = parseInt(this.$('#left').css('left'),10);
        this.$('#center').animate({
            left: centerleft > 0 ?
            0 : leftwidth
        }, {
            duration: 200
        });
        this.$('#left').animate({
            left: leftleft == 0 ?
            0-leftwidth : 0
        }, {
            duration: 200
        });
        return this
    },

    infoVisible: function() {
        return parseInt(this.$('#right').css('left'),10) != this.$('#center').outerWidth()
    },

    toggleInfo: function() {
        if (this.menuVisible()) {
            this.toggleMenu();
        }
        centerwidth = this.$('#center').outerWidth();
        centerleft = parseInt(this.$('#center').css('left'),10);
        rightwidth = this.$('#right').outerWidth();
        rightleft = parseInt(this.$('#right').css('left'),10);
        this.$('#right').animate({
            left: rightleft == centerwidth ?
            rightleft-rightwidth : centerwidth
        }, {
            duration: 200
        });
        this.$('#center').animate({
            left: centerleft >= 0 ?
            0 - rightwidth : 0
        }, {
            duration: 200
        });
        this.$('#right').toggleClass('visible');
        return this
    },

    maybeToggleInfo: function() {
        if (this.infoVisible() && $(window).width() < 768) {
            this.toggleInfo();
        }
    }

});

// automatically redirect to login page, when the login isn't valid anymore.
$.ajaxSetup({
    statusCode: {
        403: function(){
            location.href = "/app/login/";
        }
    }
});
