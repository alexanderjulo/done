from datetime import datetime, date
from flask import url_for, render_template
from flask.ext.classy import FlaskView


class BaseView(FlaskView):
    def _render_template(self, *args, **kwargs):
        return render_template(self.template + '.html', *args, **kwargs)


def static(filename):
    """A helper that will be used as a filter to avoid complicated
    url_for/static clauses. This was strings can just be filtered in
    the format of `'filename'|static`.

    :param string: the filename of a static file."""
    return url_for('static', filename=filename)


def strpisodate(string):
    """As python date objects don't support the strptime method we
    always need to construct a datetime object with the given data
    first and then generate a date object with the datetime object's
    data, which is what this function does.

    :param string: an iso date string
    :rtype: date object"""
    if string is None:
        return None
    try:
        dt = datetime.strptime(string, '%Y-%m-%d')
        d = date(year=dt.year, month=dt.month, day=dt.day)
        return d
    except ValueError:
        return None


def setUp(app):
    app.add_template_filter(static)
