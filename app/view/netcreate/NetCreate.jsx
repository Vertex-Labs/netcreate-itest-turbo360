/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

    NetCreate

    The basic React Component structure of the app looks like this:

        NetCreate
        +- NodeSelector
        |  +- NodeDetail
        |  +- AutoComplete
        |  |  +- AutoSuggest
        |  +- EdgeEntry
        |     +- *AutoComplete (for Target Node)*
        +- NetGraph
           +- D3SimpleNetGraph
              +- D3

    `NetCreate` is the root element. It is a wrapper for the key app
    elements `NodeSelector` and `NetGraph`.

    It does not do any data or event handling.  Those are handled individually
    by the respective Components.

  * All state is maintained in `nc-logic.js`
  * It handles events from NodeSelector, EdgeEntry, and NetGraph components
      and passes data and upates across them.

    PROPS  ... (none)
    STATE  ... (none)
    EVENTS ... (none)

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

/// UNISYS INITIALIZE REQUIRES for REACT ROOT /////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const UNISYS = require('unisys/client');
const UR = require('@ursys/core');
const URADD = require('@ursys/addons');
const SessionShell = require('unisys/component/SessionShell');

/// SWITCHES //////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var DBG = false;
const PROMPTS = require('system/util/prompts');
const PR = PROMPTS.Pad('ACD');

/// LIBRARIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const React = require('react');
const ReactStrap = require('reactstrap');
const { Button } = ReactStrap;
const NCSearch = require('./components/NCSearch');
const NCNode = require('./components/NCNode');
const NCGraph = require('./components/NCGraph');
const InfoPanel = require('./components/InfoPanel');
const FiltersPanel = require('./components/filter/FiltersPanel');
const NCLOGIC = require('./nc-logic'); // require to bootstrap data loading
const FILTERMGR = require('./filter-mgr'); // handles filtering functions
const EDGEMGR = require('./edge-mgr'); // handles edge synthesis
const SELECTIONMGR = require('./selection-mgr'); // handles UI selection events
const HILITEMGR = require('./hilite-mgr'); // handles UI hilite events
const CMTMGR = require('./comment-mgr');
const FILTER = require('./components/filter/FilterEnums');
import URCommentStatus from './components/URCommentStatus';

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NetCreate extends UNISYS.Component {
  constructor() {
    super();
    UNISYS.ForceReloadOnNavigation();

    /** _ur core and _ur_addons reachability tests **/
    UR.ClientTest();
    URADD.AddonClientTest();
    const SM = new UR.StateMgr('NETCREATE');
    SM._initializeState({ prop_1: 1 });
    console.log('SM:StateMgr contains:', SM.state());
    /** end of _ur core and _ur_addons tests **/
    URADD.COMMENT.Init();

    this.state = {
      isConnected: true,
      isLoggedIn: false,
      requireLogin: this.AppState('TEMPLATE').requireLogin,
      disconnectMsg: '',
      layoutNodesOpen: true,
      layoutFiltersOpen: false,
      commentStatusMessage: 'waiting...'
    };
    this.OnDOMReady(() => {
      if (DBG) console.log(PR, 'OnDOMReady');
    });
    this.OnReset(() => {
      if (DBG) console.log(PR, 'OnReset');
    });
    this.OnStart(() => {
      if (DBG) console.log(PR, 'OnStart');
    });
    this.OnAppReady(() => {
      if (DBG) console.log(PR, 'OnAppReady');
    });
    this.OnRun(() => {
      if (DBG) console.log(PR, 'OnRun');
    });
    this.OnDisconnect(e => {
      if (DBG) console.log(PR, 'OnDisconnect');
      // This is now handled by the UDATA "DISCONNECT" message.
      // so that we can show a message explaining the cause of disconnect.
      // this.setState({ isConnected: false });
    });

    this.onStateChange_SESSION = this.onStateChange_SESSION.bind(this);
    this.onDisconnect = this.onDisconnect.bind(this);
    this.onFilterBtnClick = this.onFilterBtnClick.bind(this);

    this.OnAppStateChange('SESSION', this.onStateChange_SESSION);

    const UDATA = UNISYS.NewDataLink(this);
    UDATA.HandleMessage('DISCONNECT', this.onDisconnect);
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** SESSION is called by SessionShell when the ID changes
      Show or hide netgraph depending on template settings.
   */
  onStateChange_SESSION(decoded) {
    this.setState({ isLoggedIn: decoded.isValid });
  }

  onDisconnect(e) {
    const time = new Date().toLocaleTimeString();
    this.setState({
      isConnected: false,
      disconnectMsg: `${e.detail.message} ${time}`
    });
  }

  /// REACT LIFECYCLE METHODS ///////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** This is the root component, so this fires after all subcomponents have
      been fully rendered by render().
   */
  componentDidMount() {
    // Init dragger
    let dragger = document.getElementById('dragger');
    dragger.onmousedown = this.handleMouseDown;
  }

  componentWillUnmount() {
    this.AppStateChangeOff('SESSION', this.onStateChange_SESSION);
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  onFilterBtnClick(e) {
    this.setState(state => {
      return { layoutFiltersOpen: !state.layoutFiltersOpen };
    });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Define the component structure of the web application
   */
  render() {
    const {
      isLoggedIn,
      disconnectMsg,
      layoutNodesOpen,
      layoutFiltersOpen,
      commentStatusMessage,
      handleMessageUpdate
    } = this.state;

    // show or hide graph
    // Use 'visibiliity' css NOT React's 'hidden' so size is properly
    // calculated on init
    let hideGraph = 'visible';
    if (this.state.requireLogin && !isLoggedIn) hideGraph = 'hidden';

    // note: the navbar is in init-appshell.jsx
    return (
      <div className="--NetCreate nc-base">
        <div
          className="--NetCreate_Fixed_Top_SaveAlert nc-savealert"
          hidden={this.state.isConnected}
        >
          <div>
            <b>{disconnectMsg}!</b> Your changes will not be saved! Please report
            &quot;
            {disconnectMsg}&quot; to your administrator to restart the graph.
          </div>
        </div>
        <div className="--NetCreate_Fixed_Top nc-navbar">
          <SessionShell />
          <div style={{ flexGrow: 1 }}></div>
          <URCommentStatus
            message={commentStatusMessage}
            handleMessageUpdate={handleMessageUpdate}
          />
          <div style={{ flexGrow: 1 }}></div>
        </div>

        <div
          className="--NetCreate_Rows"
          style={{
            display: 'flex',
            flexFlow: 'row nowrap',
            backgroundColor: '#EEE',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            visibility: hideGraph
          }}
        >
          <div
            className="--NetCreate_Columns"
            id="left"
            style={{
              backgroundColor: '#EEE',
              flex: '1 1 25%',
              maxWidth: '400px',
              padding: '10px',
              overflowY: 'scroll',
              overflowX: 'auto',
              marginTop: '38px'
            }}
          >
            {/*** LEFT EDITOR COLUMN ***************/}
            <div
              className="--NetCreate_Column_Left"
              style={{ display: 'flex', flexFlow: 'column nowrap' }}
            >
              <NCSearch />
              <NCNode />
              {/* <Search /> */}
              {/* <NodeSelector /> */}
            </div>
          </div>
          {/*** CENTER NETVIEW COLUMN***************/}
          <div
            className="--NetCreate_Column_NetView"
            id="middle"
            style={{
              backgroundColor: '#fcfcfc',
              flex: '3 0 60%',
              marginTop: '38px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <InfoPanel />
            <NCGraph />
          </div>
          {/*** RIGHT VIEW COLUMN ***************/}
          <div
            className="--NetCreate_Column_Filters_Open"
            id="right"
            style={{
              marginTop: '38px',
              padding: '0 5px',
              backgroundColor: '#6c757d',
              borderTopLeftRadius: layoutFiltersOpen ? '10px' : '0',
              paddingBottom: '25px' // avoid footer
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'end',
                width: layoutFiltersOpen ? '100%' : '0',
                height: layoutFiltersOpen ? '100%' : 'inherit',
                overflow: 'hidden'
              }}
            >
              <Button
                onClick={this.onFilterBtnClick}
                style={{
                  width: '90px',
                  borderTopLeftRadius: '10px',
                  paddingBottom: '10px',
                  backgroundColor: '#6c757d',
                  border: 'none',
                  boxShadow: 'none',
                  position: layoutFiltersOpen ? 'inherit' : 'absolute'
                }}
              >
                {!layoutFiltersOpen && `< `}
                {FILTER.PANEL_LABEL}
                {layoutFiltersOpen && ` >`}
              </Button>
              <FiltersPanel hidden={!layoutFiltersOpen} />
            </div>
          </div>
        </div>
        <div
          className="--NetCreate_Column_Break_Info"
          style={{
            fontSize: '10px',
            // position: 'fixed',
            left: '0px',
            bottom: '0px',
            right: '0px',
            zIndex: '1500',
            color: '#aaa',
            backgroundColor: '#eee',
            padding: '5px 10px'
          }}
        >
          Please contact Professor Kalani Craig, Institute for Digital Arts &
          Humanities at (812) 856-5721 (BH) or craigkl@indiana.edu with questions or
          concerns and/or to request information contained on this website in an
          accessible format.
        </div>
        <div id="dialog-container"></div>
      </div>
    ); // end return
  } // end render()
} // end class NetCreate

/// EXPORT UNISYS SIGNATURE ///////////////////////////////////////////////////
/// used in init.jsx to set module scope early
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
NetCreate.UMOD = module.id;

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NetCreate;
