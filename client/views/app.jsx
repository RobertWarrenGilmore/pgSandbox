var appInfo = require('../../appInfo.json');
var React = require('react');
var ReactRouter = require('react-router');
var Link = ReactRouter.Link;
var Fluxxor = require('fluxxor');
var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var App = React.createClass({
  mixins: [
    FluxMixin, StoreWatchMixin('title', 'auth')
  ],
  getStateFromFlux: function() {
    var state = {
      loggedIn: !!this.getFlux().store('auth').getAuth(),
      title: this.getFlux().store('title').get()
    };
    return state;
  },
  _updateTitle: function() {
    document.title = appInfo.name;
    if (this.state.title && this.state.title.length) {
      document.title += ' - ' + this.state.title;
    }
  },
  componentDidMount: function() {
    this._updateTitle();
  },
  componentDidUpdate: function(prevProps, prevState) {
    this._updateTitle();
  },
  render: function() {
    var result = (
      <div>
        <header>
          <nav>
            {this.state.loggedIn
              ? (
                <Link to='/logout'>
                  log out
                </Link>
              )
              : (
                <Link to='/login'>
                  log in
                </Link>
              )}
          </nav>
        </header>
        <main>
          {this.props.children}
        </main>
      </div>
    );
    return result;
  }
});

module.exports = App;
