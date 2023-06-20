if (window.NC_DBG) console.log(`inc ${module.id}`);
/// SYSTEM INTEGRATION ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const UNISYS      = require('unisys/client');
const REFLECT     = require('system/util/reflection');
/// MAGIC: DevDBLogic will add UNISYS Lifecycle Hooks on require()
const LOGIC       = require('./devsession-logic');
const {Switch, Route, Redirect, Link} = require('react-router-dom');

var   DBG         = false;

/// LIBRARIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const React       = require('react');
const ReactStrap  = require('reactstrap');
const PROMPTS     = require('system/util/prompts');
const PR          = PROMPTS.Pad('DevSession');
const SESSION     = require('unisys/common-session');

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/ This is the root component for the view
/*/ class DevSession extends UNISYS.Component {
      constructor(props) {
        super(props);
        UNISYS.ForceReloadOnNavigation();

        /* INITIALIZE COMPONENT STATE from UNISYS */
        // get any state from 'VIEW' namespace; empty object if nothing
        // UDATA.AppState() returns a copy of state obj; mutate/assign freely
        let state = this.AppState('VIEW');
        // initialize some state variables
        state.description = state.description || 'session logic testbed';
        // REACT TIP: setting state directly works ONLY in React.Component constructor!
        this.state = state;

        /* UNISYS STATE CHANGE HANDLERS */
        // bind 'this' context to handler function
        // then use for handling UNISYS state changes
        this.UnisysStateChange = this.UnisysStateChange.bind(this);
        // NOW set up handlers...
        this.OnAppStateChange('VIEW', this.UnisysStateChange);

      } // constructor

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// UNISYS state change handler - registered by UNISYS.OnStateChange()
  /// state is coming from UNISYS
      UnisysStateChange( state ) {
        if (DBG) console.log(`.. REACT <- state`,state,`via ${this.udata.UID()}'`);

        // update local react state, which should force an update
        this.setState(state);
      }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// COMPONENT state change handler - registered in render()
  /// state is coming FROM component, which is updating already
      handleTextChange( event ) {
        let target = event.target;
        let state = {
          description : target.value
        }
        if (DBG) console.log(`REACT -> state`,state,`to ${this.udata.UID()}`);
        this.SetAppState('VIEW',state,this.uni_id);
      }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// COMPONENT this interface has composed
      componentDidMount() {
        // start the application phase
        let className = REFLECT.ExtractClassName(this);
        if (DBG) console.log(`${className} componentDidMount`);
      } // componentDidMount
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      SessionEdit ({ match, location }) {
        console.log(`SessionEdit edit/${match.params.token}`);
        let token = match.params.token;
        let decoded = SESSION.DecodeToken(token);
        if (decoded) {
          console.log('DECODED',decoded);
          return (
            <div>
              <p>
                <small>matching subroute: [{token}]</small><br/>
                <span style={{color:'green'}}><small>valid token: groupID {decoded.groupId}</small></span>
              </p>
            </div>
          );
        } else {
          return (
            <div>
              <p>
                <small>matching subroute: [{token}]</small><br/>
                <span style={{color:'red'}}><small>COULD NOT DECODE TO VALID GROUP ID</small></span>
              </p>
            </div>
          );
        }
      }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /*/ Try to route the following
      http://localhost:3000/#dev-unisys/use/student/UNIT_KEY/USER_KEY/
  /*/ render() {
        return (
            <div id='fdshell' style={{padding:'10px'}}>
              <h2>SESSIONS DEV TESTING</h2>
              <Route path={`${this.props.match.path}/edit/:token`} component={this.SessionEdit}/>
              <p>{this.state.description}</p>
            </div>
        );
      } // render

    } // class DevUnisys

/// EXPORT UNISYS SIGNATURE ///////////////////////////////////////////////////
/// used in init.jsx to set module scope early
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
DevSession.UMOD = module.id;

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = DevSession;
