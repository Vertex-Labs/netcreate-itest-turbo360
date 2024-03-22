/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Generic Dialog

  USE:

    <NCDialog
      statekey={key}
      value={value}
      onChange={this.handleInputUpdate}
      onSelect={this.handleSelection}
    />

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const Draggable = require('react-draggable');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'NCDialog';

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NCDialog extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      message = 'Are you sure?',
      okmessage = 'OK',
      cancelmessage = 'Cancel',
      onOK,
      onCancel
    } = this.props;
    const OKBtn = <button onClick={onOK}>{okmessage}</button>;
    const CancelBtn = onCancel ? (
      <button onClick={onCancel}>{cancelmessage}</button>
    ) : (
      ''
    );
    return (
      <div className="dialog">
        <div className="screen"></div>
        <Draggable>
          <div className="dialogwindow">
            <div className="dialogmessage">{message}</div>
            <div className="dialogcontrolbar">
              {CancelBtn}
              {`\u00a0`}
              {OKBtn}
            </div>
          </div>
        </Draggable>
      </div>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCDialog;
