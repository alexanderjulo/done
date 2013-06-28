import os
from flask import render_template, redirect, url_for
from done.tools import BaseView


class PublicView(BaseView):

    route_base = '/'
    template = 'public'

    def _render_template(self, template, *args, **kwargs):
        kwargs['link'] = template
        return render_template(
            os.path.join(self.template, template + '.html'),
            *args,
            **kwargs
        )

    def index(self):
        return self._render_template('home')

    def home(self):
        return redirect(url_for('PublicView:index'), 301)

    def features(self):
        return self._render_template('features')

    def pricing(self):
        return self._render_template('pricing')

    def roadmap(self):
        return self._render_template('roadmap')

    def signup(self):
        return self._render_template('signup')


def setUp(app):
    """A helper to handle the lazy setup.
    It connects the coded functionality to the active app instance."""
    PublicView.register(app)
