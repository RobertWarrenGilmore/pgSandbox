var appInfo = require('../../appInfo.json');
var React = require('react');
var ReactRouter = require('react-router');
var Link = ReactRouter.Link;
var IndexLink = ReactRouter.IndexLink;
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
          <Link to='/'>
            <h1>
              {appInfo.name}
            </h1>
          </Link>
          <nav>
            <div className='hamburgerButton'>
              ≡
            </div>
            <IndexLink activeClassName='active' to='/'>
              home
            </IndexLink>
            <div className='spacer'></div>
            {this.state.loggedIn
              ? (
                <Link activeClassName='active' to='/logOut'>
                  log out
                </Link>
              )
              : (
                [
                  <Link activeClassName='active' to='/logIn'>
                    log in
                  </Link>,
                  <Link activeClassName='active' to='/register'>
                    register
                  </Link>
                ]
              )}
          </nav>
        </header>
        <main>
          {this.props.children}
        </main>
        <footer>
        </footer>
      </div>
    );
    return result;
  }
});

module.exports = App;
