import os
import json
from done.tools import BaseView
from done.models import Task, Project, Area


class AppView(BaseView):
    """The main app view, that will handle all task management."""

    template = 'ui'

    def index(self):
        """Render the app.

        We include a bootstrapped version of all data, because backbone
        says everything else is bad. :("""

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
            tasks=tasks_json,
            projects=projects_json,
            areas=areas_json
        )


def setUp(app):
    """A helper to handle the lazy setup.
    It connects the coded functionality to the active app instance."""
    AppView.register(app)
