import os
from flask import render_template, redirect, url_for
from flask.ext.classy import route
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
        return self._render_template('about')

    def about(self):
        return redirect(url_for('PublicView:index'), 301)

    def docs(self):
        return self._render_template('docs')

    def signup(self):
        return redirect(url_for('AppView:signup'), 301)

    @route('/login/', methods=['GET', 'POST'])
    def login(self):
        return redirect(url_for('AppView:login'), 301)


def setUp(app):
    """A helper to handle the lazy setup.
    It connects the coded functionality to the active app instance."""
    PublicView.register(app)
