import os
from datetime import date, timedelta
from flask import redirect, url_for, render_template, request
from done.models import *
from done.tools import BaseView


class PublicView(BaseView):

    route_base = '/'
    template = 'public'

    def _render_template(self, template, *args, **kwargs):
        return render_template(
            os.path.join(self.template, template + '.html'),
            *args,
            **kwargs
        )

    def index(self):
        return self._render_template('home')

    def features(self):
        return self._render_template('features')

    def pricing(self):
        return self._render_template('pricing')

    def roadmap(self):
        return self._render_template('roadmap')

    def signup(self):
        return self._render_template('signup')


class AppView(BaseView):
    """The main app view, that will handle all task management."""

    template = 'tasks'

    def index(self):
        """Render the app."""
        return self._render_template()


def setUp(app):
    """A helper to handle the lazy setup.
    It connects the coded functionality to the active app instance."""
    PublicView.register(app)
    AppView.register(app)
