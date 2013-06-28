import os
from done.tools import BaseView


class AppView(BaseView):
    """The main app view, that will handle all task management."""

    template = 'tasks'

    def index(self):
        """Render the app."""
        return self._render_template()


def setUp(app):
    """A helper to handle the lazy setup.
    It connects the coded functionality to the active app instance."""
    AppView.register(app)
