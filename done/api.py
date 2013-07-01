import json
from datetime import date
from flask import Response, request, g
from flask.ext.classy import route
from done import db
from done.tools import *
from done.models import *
from done.auth import auth_required


class APIBaseView(BaseView):

    decorators = [auth_required]

    def _json_response(self, data, status=200):
        """Returns a response object with the json representation of the
        data, that has the `application/json` mimetype."""
        return Response(
            json.dumps(data),
            mimetype='application/json',
            status=status
        )

    def _json_error(self, message):
        result = {
            'error': message
        }
        return self._json_response(result, 400)

    def _json_success(self, message):
        result = {
            'success': message
        }
        return self._json_response(result)

    def _json_elementlist(self, elements):
        result = []
        for element in elements:
            result.append(element.repr)
        return self._json_response(result)


class TaskView(APIBaseView):

    route_base = '/api/tasks'

    def _update(self, task_id, changes):
        print changes
        """Modify a task. Returns the modified version of the task."""
        task = Task.query.get_or_404(task_id)
        if task.owner_id != g.current_user.id:
            return self._json_response('Unauthorized access.', 403)
        for key, value in changes.items():
            if key == 'name':
                task.name = value
            if key == 'area_id':
                task.area_id = value
            if key == 'project_id':
                task.project_id = value
            if key == 'due':
                task.due = strpisodate(value)
            if key == 'completed':
                #if not task.completed:
                # TODO: take care of recurral
                task.completed = strpisodate(value)
        db.session.commit()
        return self._json_response(task.repr)

    def index(self):
        """Returns all tasks."""
        tasks = Task.query.filter_by(owner_id=g.current_user.id).all()
        return self._json_elementlist(tasks)

    @route('/due/today')
    def duetoday(self):
        """Returns tasks due today."""
        tasks = Task.query.filter(
            Task.due == date.today(),
            Task.owner_id == g.current_user.id
        ).all()
        return self._json_elementlist(tasks)

    @route('/due/<string:day>')
    def dueondate(self, day):
        """Returns all tasks due on that day."""
        try:
            day = strpisodate(day)
        except ValueError:
            return self._json_error('Invalid date.')
        tasks = Task.query.filter(
            Task.due == day,
            Task.owner_id == g.current_user.id
        ).all()
        return self._json_elementlist(tasks)

    @route('/due/<string:start>/<string:end>')
    def duebetween(self, start, end):
        """Returns all tasks due between the two days."""
        try:
            start = strpisodate(start)
            end = strpisodate(end)
        except ValueError:
            return self._json_error('Invalid date.')
        tasks = Task.query.filter(
            Task.due.between(start, end),
            Task.owner_id == g.current_user.id
        ).all()
        return self._json_elementlist(tasks)

    @route('/project/<int:project_id>')
    def project(self, project_id):
        """Returns all tasks of the project."""
        tasks = Task.query.filter(
            Task.project_id == project_id,
            Task.owner_id == g.current_user.id
        ).all()
        return self._json_elementlist(tasks)

    @route('/area/<int:area_id>')
    def area(self, area_id):
        """Returns all tasks in the area, that are not project specific."""
        tasks = Task.query.filter(
            Task.area_id == area_id,
            Task.owner_id == g.current_user.id
        ).all()
        return self._json_elementlist(tasks)

    @route('/completed')
    def completed(self, completed):
        """Return all completed tasks."""
        tasks = Task.query.filter(
            Task.completed is not None,
            Task.owner_id == g.current_user.id
        ).all()
        return self._json_elementlist(tasks)

    def post(self):
        """Create a new task. The task information should be specified
        as post data, as they are named in the model. Returns the newly
        created task."""
        print request.json
        if request.json:
            data = request.json
        elif request.form:
            data = request.form
        else:
            abort(400)
        task = Task()
        if not data.get('name'):
            return self._json_error('No name specified.')
        task.name = data.get('name')
        if data.get('due'):
            due = strpisodate(data.get('due'))
            task.due = due
        task.area_id = data.get('area_id')
        task.project_id = data.get('project_id')
        task.owner_id = g.current_user.id
        db.session.add(task)
        db.session.commit()
        return self._json_response(task.repr)

    def patch(self, task_id):
        """Alter a task by just passing the attributes to change."""
        return self._update(task_id, request.json or request.form)

    def put(self, task_id):
        """Alter a task by passing in all attributes."""
        return self._update(task_id, request.json or request.form)

    def delete(self, task_id):
        """Delete the task with the given task id."""
        task = Task.query.get_or_404(task_id)
        if task.owner_id != g.current_user.id:
            return self._json_response('Unauthorized access.', 403)
        db.session.delete(task)
        db.session.commit()
        return self._json_success('Resource was successfully deleted.')


class ProjectView(APIBaseView):

    route_base = '/api/projects'

    def index(self):
        projects = Project.query.filter_by(owner_id=g.current_user.id).all()
        print projects[0].repr
        return self._json_elementlist(projects)

    def post(self):
        """Create a new project."""
        if request.json:
            data = request.json
        elif request.form:
            data = request.form
        else:
            abort(400)
        project = Project()
        if not data.get('name'):
            return self._json_error('No name specified.')
        project.name = data.get('name')
        project.owner_id = g.current_user.id
        db.session.add(project)
        db.session.commit()
        return self._json_response(project.repr)


class AreaView(APIBaseView):

    route_base = '/api/areas'

    def index(self):
        areas = Area.query.filter_by(owner_id=g.current_user.id).all()
        return self._json_elementlist(areas)

    def post(self):
        """Create a new area."""
        if request.json:
            data = request.json
        elif request.form:
            data = request.form
        else:
            abort(400)
        area = Area()
        if not data.get('name'):
            return self._json_error('No name specified.')
        area.name = data.get('name')
        area.owner_id = g.current_user.id
        db.session.add(area)
        db.session.commit()
        return self._json_response(area.repr)


def setUp(app):
    TaskView.register(app)
    ProjectView.register(app)
    AreaView.register(app)
