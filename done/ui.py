import os
import json
from flask import render_template, g, redirect, url_for, flash, session, \
    request
from flask.ext.classy import route
from done.tools import BaseView
from done.models import User, Task, Project, Area
from done.auth import get_current_user


class AppView(BaseView):
    """The main app view, that will handle all task management."""

    template = 'ui'

    def _render_template(self, template, *args, **kwargs):
        return render_template(
            os.path.join(self.template, template + '.html'),
            *args,
            **kwargs
        )

    def index(self):
        """Render the app.

        We include a bootstrapped version of all data, because backbone
        says everything else is bad. :("""

        if not get_current_user():
            return redirect(url_for('AppView:login'))

        tasks = Task.query.all()
        tasks_repr = []
        for task in tasks:
            tasks_repr.append(task.repr)
        tasks_json = json.dumps(tasks_repr)

        projects = Project.query.all()
        projects_repr = []
        for project in projects:
            projects_repr.append(project.repr)
        projects_json = json.dumps(projects_repr)

        areas = Area.query.all()
        areas_repr = []
        for area in areas:
            areas_repr.append(area.repr)
        areas_json = json.dumps(areas_repr)

        return self._render_template(
            'app',
            tasks=tasks_json,
            projects=projects_json,
            areas=areas_json
        )

    def signup(self):
        return self._render_template('signup')

    @route('/login/', methods=['GET', 'POST'])
    def login(self):
        if request.method == 'GET':
            return self._render_template('login')
        else:
            if request.json:
                data = request.json
            elif request.form:
                data = request.form
            else:
                return 'User and password are required.', 400
            if User.auth(data.get('user'), data.get('password')):
                user = User.query.filter_by(name=data.get('user')).first()
                session['user'] = user.id
                session.permanent = True
                return redirect(url_for('AppView:index'))
            else:
                return redirect(url_for('AppView:login'))


def setUp(app):
    """A helper to handle the lazy setup.
    It connects the coded functionality to the active app instance."""
    AppView.register(app)
