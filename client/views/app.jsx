var React = require('react');
var ReactRouter = require('react-router');
var Link = ReactRouter.Link;
var Fluxxor = require('fluxxor');
var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var App = React.createClass({
  mixins: [
    FluxMixin, StoreWatchMixin('auth')
  ],
  componentWillMount: function() {
    this.getFlux()
      .actions
      .auth
      .resumeAuth();
  },
  getStateFromFlux: function() {
    var state = {
      loggedIn: !!this.getFlux()
        .store('auth')
        .getAuth()
    };
    return state;
  },
  render: function() {
    var result = (
      <div>
        <header>
          <nav>
            {this.state.loggedIn
              ? <Link to='/logout'>
                  log out
                </Link>
              : <Link to='/login'>
                log in
              </Link>}
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
