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
        this.listenTo(this.model, 'change', this.render);
        this.listenTo(this.model, 'remove', this.remove);
        this.listenTo(this.model, 'destroy', this.remove);
        // no dragging for now..
        // this.$el.draggable({revert: 'invalid'});
        // this.$el.data('model', this.model);
    },

    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },

    activate: function(event) {
        event.preventDefault();
        $('#tasks li').removeClass('active');
        this.$el.addClass('active');
        app.infoview.show(this.model);
    },

});

var Tasks = Backbone.Collection.extend({

    model: Task,

    url: '/api/tasks/'

});

var TasksView = Backbone.View.extend({

    el: '#tasks',

    events: {
        'click #tasks-show-completed': 'showCompleted',
        'click #tasks-hide-completed': 'hideCompleted',
        'click #task-submit': 'submitOnClick',
        'keypress #task-input': 'submitOnEnter'
    },

    filterdata: null,

    template: _.template($('#tasks-template').html()),

    initialize: function() {
        this.render();
        this.listenTo(this.collection, 'add', this.add);
        this.listenTo(this.collection, 'change', this.render);
    },

    render: function() {
        this.$el.html(this.template());
        if (this.filterData) {
            tasks = this.collection.where(this.filterData);
        } else {
            tasks = this.collection.models;
        }
        _.each(tasks, function(task) {
            this.add(task);
        }, this);
        return this;
    },

    select: function(filterData) {
        this.filterData = filterData
        this.render();
    },

    add: function(task) {
        view = new TaskView({model: task});
        view.render();
        if (task.get('completed')) {
            this.$('#tasks-list-completed').append(view.el);
        } else {
            this.$('#tasks-list').append(view.el);
        }
        
    },

    showCompleted: function() {
        this.$('#tasks-show-completed').addClass('hidden');
        this.$('#tasks-completed').removeClass('hidden');
    },

    hideCompleted: function() {
        this.$('#tasks-completed').addClass('hidden');
        this.$('#tasks-show-completed').removeClass('hidden');
    },

    submit: function() {
        input = this.$('#task-input').val();
        if (input == '') {
            return;
        }
        this.$('#task-input').val('');
        task = new Task({name: input, created: moment(new Date()).format('YYYY-MM-DD')});
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
        this.listenTo(this.model, 'change', this.render);
        this.listenTo(this.model, 'remove', this.render);
        this.listenTo(this.model, 'destroy', this.render);
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
        this.filterData = options.filterData;
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
        app.menuview.$('li').removeClass('active');
        this.$el.addClass('active');
        app.tasksview.select(this.filterData);
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
            filterData: {
                project_id: null,
                area_id: null 
            },
            container: '#menu-incoming',
            route: 'inbox'
        },
        {
            name: 'Today',
            filterData: {
                due: moment(new Date()).format('YYYY-MM-DD'),
                completed: null
            },
            container: '#menu-focus',
            route: 'today'
        },
        {
            name: 'Next',
            filterData: {due: undefined},
            container: '#menu-focus',
            route: 'next'
        },
        {
            name: 'All tasks',
            filterData: null,
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
                filterData: entry.filterData,
                route: entry.route,
                id: 'menu-entry-' + entry.route,
                menuview: this
            });
            this.$(entry.container).append(view.render().el);
        }, this);

        this.projects.each(function(project) {
            view = new MenuEntryView({
                name: project.get('name'),
                filterData: {project_id: project.get('id')},
                droppable: true,
                route: 'project/' + project.get('id'),
                id: 'menu-entry-' + 'project/' + project.get('id'),
                menuview: this
            });
            this.$('#menu-projects').append(view.render().el);
        }, this);

        this.areas.each(function(area) {
            view = new MenuEntryView({
                name: area.get('name'),
                filterData: {area_id: area.get('id')},
                droppable: true,
                route: 'area/' + area.get('id'),
                id: 'menu-entry-' + 'area/' + area.get('id'),
                menuview: this
            });
            this.$('#menu-areas').append(view.render().el);
        }, this);

        return this;
    },

    newProject: function() {
        name = prompt("Please enter a name for the project:", "");
        if (name != "") {
            this.projects.create({name: name});
            this.render();
        }
    },

    newArea: function() {
        name = prompt("Please enter a name for the area:", "");
        if (name != "") {
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
        'all': 'all'
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
        this.goTo('project/' + project_id);
    },

    area: function(area_id) {
        this.goTo('area/' + area_id);
    },

    all: function() {
        this.goTo('all');
    }

})

var App = Backbone.View.extend({

    initialize: function(data) {
        this.tasks = new Tasks();
        this.tasks.reset(data.tasks);
        this.projects = new Projects();
        this.projects.reset(data.projects);
        this.areas = new Areas();
        this.areas.reset(data.areas);
        this.tasksview = new TasksView({collection: this.tasks});
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
    }

});
