$(function() {
  var Task = Backbone.Model.extend({

    url: function() {
      if (this.get('id')) {
        return '/api/tasks/' + this.get('id')
      } else {
        return '/api/tasks/'
      }
    },

    defaults: function() {
      return {
        id: null,
        owner_id: null,
        name: null,
        area_id: null,
        project_id: null,
        recurral: null,
        created: null,
        due: null,
        completed: null
      }
    }

  });

  var Project = Backbone.Model.extend({

    url: function() {
      if (this.get('id')) {
        return '/api/projects/' + this.get('id')
      } else {
        return '/api/projects/'
      }
    },

    defaults: function() {
      return {
        id: null,
        owner_id: null,
        name: null,
        area_id: null,
        created: null,
        due: null,
        completed: null
      }
    }

  });

  var Area = Backbone.Model.extend({

    url: function() {
      if (this.get('id')) {
        return '/api/areas/' + this.get('id')
      } else {
        return '/api/areas/'
      }
    },

    defaults: function() {
      return {
        id: null,
        owner_id: null,
        name: null,
        area_id: null,
      }
    }

  });

  var TaskList = Backbone.Collection.extend({

    model: Task,
    url: '/api/tasks',

  });

  var ProjectList = Backbone.Collection.extend({

    model: Project,
    url: '/api/projects',

  });

  var AreaList = Backbone.Collection.extend({

    model: Area,
    url: '/api/areas',

  });

  var TaskView = Backbone.View.extend({

    id: function() {
      return 'task-' + this.model.id;
    },

    tagName: 'tr',

    className: function() {
      if (this.model.get('completed')) {
        return 'success';
      } else if (this.model.get('due')) {
          if (moment(this.model.get('due')).isSame(moment(), 'day')) {
              return 'warning';
          } else if (moment(this.model.get('due')).isBefore(moment(), 'day')) {
              return 'error'
          }
      } else {
        return '';
      }
    },

    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
    },

    events: {
      'click': 'updateInfo',
      'dragstart': 'drag'
    },

    template: _.template($('#templates #task-template').html()),

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.$el.attr('class', this.className());
      this.$el.data('model', this.model);
      this.$el.draggable({
        helper: function(event) {
          console.log('building helper element.')
          return $('<div><table class="table span6"></table></div>')
            .find('table').append($(event.target).closest('tr').clone()).end();
        }
      });
      return this;
    },

    updateInfo: function () {
      taskinfoview.show(this.model);
    },

    drag: function (event) {
      console.log("drag started!");
      event.model = this.model;
    }

  });

  var TaskInfoView = Backbone.View.extend({

    el: '#info',

    template: _.template($('#templates #info-template').html()),

    events: {
      'click #task-done': "markAsDone",
      'click #task-postpone': "markAsPostponed",
      'click #task-delete': "markAsDeleted",
      'click .editable': "editField",
      'keypress .editor': "saveFieldOnEnter",
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    show: function(task) {
      if (this.$el.css('display') == 'none') {
        this.$el.show();
      }
      if (this.model) {
        this.stopListening(this.model);
      }
      this.editing = null;
      this.model = task;
      this.listenTo(this.model, 'change', this.render);
      this.render();
    },

    markAsDone: function() {
      this.model.set('completed', moment().format('YYYY-MM-DD'));
      this.model.save();
    },

    markAsPostponed: function() {
      this.model.set('due', moment(this.model.get('due'), 'YYYY-MM-DD').add('days', 1).format('YYYY-MM-DD'));
      this.model.save();
    },

    markAsDeleted: function() {
      console.log('destroying model');
      this.model.destroy();
      this.$el.hide();
    },

    editField: function(event) {
      if (this.editing) {
        alert('Editing already..')
        return
      }
      display = this.$(event.currentTarget);
      display.hide();
      this.editing = display.attr('data-field');
      editor = this.$('#editor-' + this.editing);
      editor.show();
    },

    saveFieldOnEnter: function(event) {
      if (event.keyCode != 13) return;
      editor = this.$(event.currentTarget);
      if (!editor.val()) return;
      this.model.set(this.editing, editor.val());
      this.editing = null;
      this.model.save();
    }
  })

  var TaskListView = Backbone.View.extend({

      el: '#tasks',

      initialize: function() {
        this.area_id = null;
        this.project_id = null;
        this.listenTo(tasklist, "add", this.add);
      },

      events: {
        "submit #task-new": "new",
        "click #task-new-submit": "new"
      },

      add: function(task) {
        view = new TaskView({model: task});
        this.$('#list').append(view.render().el);
      },

      addMany: function(tasks) {
        _.each(tasks, function(task) {
          this.add(task);
        }, this);
      },

      reset: function() {
        this.$('#list').html('');
      },

      new: function() {
        if (this.filter) {
          attributes = this.filter;
        } else {
          attributes = {};
        }
        attributes['name'] = $('#task-new .name').val();
        task = new Task(attributes);
        $('#task-new .name').val('');
        task.save();
        tasklist.add(task);
        return false;
      },

      all: function() {
        this.filter = null;
        this.addMany(tasklist.models);
      },

      filterBy: function(attributes) {
        this.filter = attributes;
        tasks = tasklist.where(attributes);
        this.reset();
        this.addMany(tasks);
      }

  });

  var TaskMenuView = Backbone.View.extend({

    el: '#menu',

    template: _.template($('#menu-template').html()),
    projectTemplate: _.template($('#templates #project-template').html()),
    areaTemplate: _.template($('#templates #project-template').html()),

    events: {
      'click li': "click",
      'drop li': "drop"
    },

    render: function() {
      this.$el.html(this.template());
      return this;
    },

    initialize: function() {
      this.listenTo(projectlist, 'add', this.addProject);
      this.listenTo(arealist, 'add', this.addArea);
      this.render();
    },

    addProject: function(project) {
      html = this.projectTemplate(project.toJSON());
      this.$('#projects').append(html);
      this.$('#projects #project-' + project.id).droppable();
    },

    addArea: function(area) {
      this.$('#areas').append(html);
    },

    click: function(event) {
      clicked = this.$(event.currentTarget);
      if(clicked.hasClass('nav-header') || clicked.hasClass('divider')) {
        return
      }
      this.$('li.active').removeClass('active');
      clicked.addClass('active');
    },

    drop: function (event, ui) {
      console.log(event.currentTarget);
      console.log(ui.draggable.data('model').get('id'));

    }

  });

  var TaskRouter = Backbone.Router.extend({
    routes: {
      "inbox": 'inbox',
      "today": 'today',
      "tomorrow": 'tomorrow',
      "everything": 'all',
      "project/:project_id": 'project',
      "area/:area_id": 'area',
      "done": 'done'
    },

    inbox: function() {
      tasklistview.filterBy({project_id: null});
    },

    today: function() {
      tasklistview.filterBy({
        'due':  moment().format('YYYY-MM-DD')
      });
    },

    tomorrow: function() {
      tasklistview.filterBy({
        'due':  moment().add('days', 1).format('YYYY-MM-DD')
      });
    },

    all: function() {
      tasklistview.all();
    },

    project: function(project_id) {
      tasklistview.filterBy({'project_id': parseInt(project_id)});
    }
  })

  tasklist = new TaskList();
  tasklist.fetch();
  projectlist = new ProjectList();
  projectlist.fetch();
  arealist = new AreaList();
  arealist.fetch();
  tasklistview = new TaskListView();
  taskinfoview = new TaskInfoView();
  taskmenuview = new TaskMenuView();
  taskroute = new TaskRouter();
  Backbone.history.start();

});

