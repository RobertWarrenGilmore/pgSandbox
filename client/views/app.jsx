var appInfo = require('../../appInfo.json');
var React = require('react');
var ReactRouter = require('react-router');
var Link = ReactRouter.Link;
var IndexLink = ReactRouter.IndexLink;
var TitleMixin = require('./titleMixin');
var classnames = require('classnames');
var auth = require('../flux/auth');
var ajax = require('../utilities/ajax');

var App = React.createClass({
  mixins: [TitleMixin()],
  getInitialState: function() {
    return {
      authCredentials: auth.getCredentials(),
      authUser: null,
      hamburgerExpanded: false
    };
  },
  _loadAuthUser: function () {
    var credentials = this.state.authCredentials;
    if (credentials) {
      var r = ajax({
        method: 'GET',
        uri: '/api/users/' + credentials.id,
        json: true,
        auth: credentials
      });
      this.setState({
        authUser: null,
        runningRequest: r // Hold on to the Ajax promise in case we need to cancel it later.
      });
      var self = this;
      return r.then(function (response) {
        if (response.statusCode === 200) {
          self.setState({
            authUser: response.body
          });
        }
        return null;
      }).catch();
    } else {
      this.setState({
        authUser: null
      });
    }
  },
  _authListener: function() {
    var self = this;
    this.setState({
      authCredentials: auth.getCredentials()
    }, function () {
      self._loadAuthUser();
    });
  },
  componentWillMount: function() {
    auth.listen(this._authListener);
    this._loadAuthUser();
  },
  componentWillUnmount: function() {
    auth.unlisten(this._authListener);
  },
  render: function() {
    var headerNavClasses = classnames({
      hamburgerExpanded: this.state.hamburgerExpanded
    });
    var result = (
      <div>
        <header>
          <Link to='/'>
            <h1>
              {appInfo.name}
            </h1>
          </Link>
          <nav className={headerNavClasses}>
            <div className='hamburgerButton' onClick={this._onHamburgerClick}>
              ≡
            </div>
            <IndexLink activeClassName='active' to='/' onClick={this._onNavClick}>
              home
            </IndexLink>
            <Link activeClassName='active' to='/users' onClick={this._onNavClick}>
              users
            </Link>
            <Link activeClassName='active' to='/blog' onClick={this._onNavClick}>
              blog
            </Link>
            <div className='spacer'></div>
            {this.state.authCredentials
              ? (
                <Link activeClassName='active' to='/logOut' onClick={this._onNavClick}>
                  log out
                </Link>
              )
              : ([
                <Link activeClassName='active' key='navLogIn' to='/logIn' onClick={this._onNavClick}>
                  log in
                </Link>,
                <Link activeClassName='active' key='navRegister' to='/register' onClick={this._onNavClick}>
                  register
                </Link>
              ])}
          </nav>
        </header>
        <main>
          {this.state.authUser ? (
            <div id='authIndicator'>
              <Link to={'/users/' + this.state.authUser.id}>
                <span className='icon-user'/>
                &nbsp;
                {this.state.authUser.givenName} {this.state.authUser.familyName}
              </Link>
            </div>
          ) : null}
          {this.props.children}
        </main>
        <footer>
        </footer>
      </div>
    );
    return result;
  },
  _onHamburgerClick: function() {
    this.setState({
      hamburgerExpanded: !this.state.hamburgerExpanded
    });
  },
  _onNavClick: function() {
    this.setState({
      hamburgerExpanded: false
    });
  }
});

module.exports = App;
