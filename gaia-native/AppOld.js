import React from 'react';
import { StyleSheet, Text, View, Picker, Button, TextInput, Alert } from 'react-native';
import Expo, { SQLite } from 'expo';

// Database and SQL Queries
const db = SQLite.openDatabase('local.db');
const addCategorySQL = `INSERT INTO category( category_name ) SELECT ? WHERE NOT EXISTS( SELECT 1 FROM category WHERE category_name=? );`; //`INSERT INTO category( category_name ) VALUES ( ? );`;
const addOutcomeLogEntry = `INSERT INTO outcome_log( time_started, time_ended, outcome_title,  category_id ) VALUES ( ?, ?, ? )`; // will need to stardardize time entries
const getLastNOutcomeLogEntries = `SELECT * FROM outcome_log ORDER BY time_started DESC LIMIT ?`;
const getAllCategories = `SELECT * FROM category WHERE category_id > 1;`;
const getCategoryIdFromName = `SELECT * FROM category where lower(name)=lower(?)`;

// Some Global constants and functions
const MAX_ALLOWED_ESTIMATE = 1;
const MIN_ALLOWED_ESTIMATE = 0;
function logIt(transaction, event){
  console.log(event);
}
function hourScaleToMilliSecondScale( timeAtHourScale ){
  return Math.round( timeAtHourScale * Math.pow( 3.6, 6) );
}

// class CurrentOutcomeHeader extends React.Component{
//     render(){
//       return(<div>p</div>);
//     }
// }
// class TimerDisplay extends React.Component{
//   // currentTime
//   // categoryIdOfCurrentOutcome
//   // estimatedTimeOfCompletion
//   // startTime
//
//     render(){
//       // ( this.props.currentTime - this.props.startTime )
//       //style={{ textAlign: 'center', fontSize: 60 }} > { ( (  ) )?}{this.state.displayedTimeMinutes}:{this.state.displayedTimeSeconds}
//       return(
//           <Text>
//           jeez
//           </Text>
//       )
//     }
// }
// class NewOutcomeInputGroup extends React.Component{
//   // categoryObjs={this.state.categoryObjectsMap}
//   // queuedCategory={this.state.categoryObjectOfQueuedOutcome}
//   // timeEstimateOfQueue={this.state.estimatedDurationOfCurrentQueuedAsFractionOfHour}
//     render(){
//
//       const categoriesAsPickerItems = this.props.categoryObjectsArray.map( ( categoryObj, indexInArray) => {
//              return(
//              < Picker.Item
//                key={categoryObj.category_id}
//                label={categoryObj.category_name}
//                value={categoryObj}  // breaks: refreshes to an unselected picker item immediately after select, when should keep selected item
//              /> );
//       });
//
//       return(
//                 < Button title="˄" style={{ height: 50, width: 100 }}  onPress={this.props.handleIncreaseEstimate}/>
//
//                 <Picker style={{ height: 50, width: 100 }} onValueChange={ this.props.handlecategoryOfQueuedOutcomeChosen }
//                 >
//                   { categoriesAsPickerItems }
//                 <Picker/>
//
//
//                 < TextInput
//                   style={{height: 40, borderColor: 'gray', borderWidth: 1}}
//                   onChangeText={ this.props.handleNewCategoryText }
//                   placeholder='Enter New Category'
//                   value={this.props.newCategoryText}
//                 />
//                 <Button
//                   title=" + "
//                   onPress={this.props.handleNewCategory}
//                 />
//
//
//                 <Text>{ '0' + Number(this.props.estimatedDurationOfCurrentQueuedAsFractionOfHour).toFixed(2) }</Text>
//                 < Button title="˅" style={{ height: 50, width: 100 }} onPress={ this.props.handleDecreaseEstimate } />
//       );
//     }
// }


// class StartButton extends React.Component{
//     render(){
//       return(
//         < Button title="START" onPress={/*this.handleStartOutcome*/} />
//       )
//     }
// }

export default class App extends React.Component {
  constructor(props){
    super(props);

    let date = new Date();
    let currentTime = date.getTime();

    this.state = {
      categoryObjectsArray: [],
      categoryObjectsMap: null,

      currentTime: null,

      categoryObjectOfCurrentOutcome: null, // artifactual declaration
      startTimeOfCurrentOutcome: currentTime,
      estimatedTimeOfCompleteionOfCurrentOutcome: currentTime,

      newCategoryText: '', // old


      categoryObjectOfQueuedOutcome: null,
      estimatedDurationOfCurrentQueuedAsFractionOfHour: 0, //lol, clarity first

      displayedTimeMinutes: 0, // old
      displayedTimeSeconds: 0, // old
    }

    // create category and outcome_log tables if not already created, get category objects and place them in state
    db.transaction( (tx) =>{

      tx.executeSql(`PRAGMA foreign_keys = ON;`, ()=>{}, logIt);
      // tx.executeSql(`DROP TABLE category`, ()=>{}, logIt);

      tx.executeSql(`CREATE TABLE IF NOT EXISTS category(
        category_id INTEGER PRIMARY KEY UNIQUE,
        category_name TEXT UNIQUE NOT NULL
      );`, [], ()=>{}, logIt);

      tx.executeSql(`CREATE TABLE IF NOT EXISTS outcome_log (
        time_started INTEGER PRIMARY KEY UNIQUE NOT NULL,
        time_ended INTEGER UNIQUE NOT NULL,
        category_id INTEGER NOT NULL,
        FOREIGN KEY( category_id ) REFERENCES category( category_id )
      );`, [], ()=>{}, logIt);

      tx.executeSql(`INSERT INTO category( category_id, category_name ) SELECT 1, 'Idle'  WHERE NOT EXISTS ( SELECT 1 FROM category WHERE category_name='Idle' );`, [], ()=>{}, logIt);


      tx.executeSql( getAllCategories, [],
        ( this_transaction, results ) => {
            let stateCopy = this.state;
            let date = new Date();
            let currentTime = date.getTime();

            stateCopy.categoryObjectsArray = results.rows._array;
            stateCopy.categoryObjectsMap = results.rows._array.reduce( ( map, categoryObj) => {
              map[categoryObj.category_id] = categoryObj;
              return map
            }, {});

            this.setState( stateCopy );
      });

    });


    // this.startIdle = this.startIdle.bind(this);
    this.validateText = this.validateText.bind(this);
    this.handleNewCategory = this.handleNewCategory.bind(this);
    this.handlecategoryOfQueuedOutcomeChosen = this.handlecategoryOfQueuedOutcomeChosen.bind(this);
    this.handleIncreaseEstimate = this.handleIncreaseEstimate.bind(this);
    this.handleDecreaseEstimate = this.handleDecreaseEstimate.bind(this);
    this.handleStartOutcome = this.handleStartOutcome.bind(this);
    // this.endIdle = this.endIdle.bind(this);
    this.updateTimer = this.updateTimer.bind(this);
  }

  componentDidMount(){
    this.timeKeeper = setInterval( () => {
      let stateCopy = this.state;
      var date = new Date()
      stateCopy.currentTime = date.getTime();

      // detect the state has changed to idle technically, and verbosely set the app state to idle
      if ( this.state.currentTime >= this.state.estimatedTimeOfCompleteionOfCurrentOutcome ){
        if (
          ( typeof( state.categoryObjectOfCurrentOutcome.category_id ) != typeof(undefined) ) &&
          ( typeof( state.categoryObjectOfCurrentOutcome.category_id ) != typeof(null) ) &&
          ( typeof( state.categoryObjectOfCurrentOutcome.category_id ) != 1 )
        ){
          stateCopy.categoryObjectOfCurrentOutcome = categoryObjectsMap[1];
          stateCopy.startTimeOfCurrentOutcome = stateCopy.currentTime;
          // stateCopy.estimatedDurationOfCurrentQueuedAsFractionOfHour = 0; // dunno the significance of this
          stateCopy.estimatedTimeOfCompleteionOfCurrentOutcome = stateCopy.currentTime;
        }
        // else // do nothing
        this.setState( stateCopy );
      }
    }, 1000)
  }

  componentWillUnmount(){
    clearInterval(this.timeKeeper);
  }

  //Checked
  // ------------
  //Unchecked








  validateText(text){
    if (text == ''){
      return false;
    } else {
      return true;
    }
  }

  handleNewCategory(){
    let categoryStringChecksOut = this.validateText( this.state.newCategoryText );

    if ( categoryStringChecksOut ){

      db.transaction( (tx) => {
        tx.executeSql( addCategorySQL, [ this.state.newCategoryText ], ()=>{}, logIt );
      });

    }
    else {
      Alert.alert('Category text doesnt check out.');
    }

    // update categories
    db.transaction( (tx) => {
      tx.executeSql( getAllCategories, [],
        ( this_transaction, results ) => {
            let stateCopy = this.state;
            stateCopy.categoryObjectsArray = results.rows._array;
            stateCopy.categoryOfQueuedOutcome = stateCopy.categoryObjectsArray[0].category_id; // will break for new users

            this.setState( stateCopy );
        }

      )
    });
  }

  handlecategoryOfQueuedOutcomeChosen( categoryObj, index ){
    let stateCopy = this.state;
    stateCopy.categoryObjectOfQueuedOutcome = categoryObj;
    this.setState( stateCopy );
  }



  handleIncreaseEstimate(){
    let stateCopy = this.state;

    if ( stateCopy.estimatedDurationOfCurrentQueuedAsFractionOfHour < MAX_ALLOWED_ESTIMATE ){
      stateCopy.estimatedDurationOfCurrentQueuedAsFractionOfHour += 0.25;
    }
    // else {} // do a neat animation that let's the user know that the max has been reached.

    this.setState( stateCopy );
  }


  handleDecreaseEstimate(){
    let stateCopy = this.state;

    if ( stateCopy.estimatedDurationOfCurrentQueuedAsFractionOfHour > MIN_ALLOWED_ESTIMATE ){
      stateCopy.estimatedDurationOfCurrentQueuedAsFractionOfHour -= 0.25;
    }
    // else {} // do a neat animation that let's the user know that the max has been reached.

    this.setState( stateCopy );
  }

  // if the current category is idle before a new outcome is called to be started, this gets called

  updateTimer(){
    let stateCopy = this.state;


    //if the state is idle, count up
    if ( this.state.idle ){
      if ( this.state.displayedTimeSeconds >= 59 ){
        stateCopy.displayedTimeSeconds = 0;
        stateCopy.displayedTimeMinutes += 1;
      }
      else {
        stateCopy.displayedTimeSeconds += 1
      }
    }
    // not idle count down
    else {
      if (this.state.displayedTimeMinutes % 15 == 0){
        // play 'beep beep' sound
      }
      if ( this.state.displayedTimeSeconds == 0 ){
        if ( this.state.displayedTimeMinutes > 0 ){
            stateCopy.displayedTimeMinutes -= 1;
            stateCopy.displayedTimeSeconds = 59;
        }
      } else {
            stateCopy.displayedTimeSeconds -= 1;
        }
    }

    this.setState( stateCopy );
  }

  handleStartOutcome(){
    // Is Time Non-Zero
    if ( this.state.estimatedDurationOfCurrentQueuedAsFractionOfHour == 0 ){
      Alert.alert('Estimated Outcome Time Must Be Greater Than 00.00');
      return;
    }
    let stateCopy = this.state;
    var date = new Date();
    let currentTime = date.getTime();
    let estimatedCompletionTime = currentTime + hourScaleToMilliSecondScale( this.state.estimatedDurationOfCurrentQueuedAsFractionOfHour );

    console.log(`Current Time: ${currentTime}\nEstimated Completion Time: ${estimatedCompletionTime}\nCategory Id: ${this.state.categoryOfQueuedOutcome}`);







    // if the state is idle, we want to make sure that data gets recorded correctly before starting a new outcome
    if ( this.state.idle ){
      // this.endIdle(currentTime);
        db.transaction( (tx) =>{
          tx.executeSql( addOutcomeLogEntry, [ stateCopy.startTimeOfCurrentOutcome, currentTime, this.state.categoryOfCurrentOutcome], ()=>{}, logIt);

          tx.executeSql( getLastNOutcomeLogEntries, [ 5 ], ( this_transaction, results) =>{
            console.log(results);
          }, logIt);

        });
    }

    clearInterval( this.state.timer );

    stateCopy.idle= false;
    stateCopy.startTimeOfCurrentOutcome= currentTime;
    stateCopy.estimatedTimeOfCurrentOutcome= estimatedCompletionTime;

    // add upcomning outcome
    db.transaction( (tx) => {
      tx.executeSql( addOutcomeLogEntry, [ currentTime, estimatedCompletionTime,  this.state.categoryOfQueuedOutcome ], ()=>{}, logIt);

      tx.executeSql( getLastNOutcomeLogEntries, [ 5 ], ( this_transaction, results) =>{
        console.log(results);
      }, logIt);

    });
    stateCopy.displayedTimeMinutes = 60 * this.state.estimatedDurationOfCurrentQueuedAsFractionOfHour;
    stateCopy.estimatedDurationOfCurrentQueuedAsFractionOfHour = 0;
    stateCopy.timer = setInterval( () => { this.updateTimer()}, 1000 );

    this.setState( stateCopy );
  }

  render() {
    // <View>
    // // <CurrentOutcomeHeader />
    //
    // // <TimerDisplay
    // //   currentTime={this.state.currentTime}
    // //   categoryIdOfCurrentOutcome={this.state.categoryObjectOfCurrentOutcome.category_id}
    // //   estimatedTimeOfCompletion={this.state.estimatedTimeOfCompleteionOfCurrentOutcome}
    // //   startTime={this.state.startTimeOfCurrentOutcome}
    // // />
    //
    // // < NewOutcomeInputGroup
    // //   categoryObjs={this.state.categoryObjectsMap}
    // //   queuedCategory={this.state.categoryObjectOfQueuedOutcome}
    // //   estimatedDurationOfCurrentQueuedAsFractionOfHour={this.state.estimatedDurationOfCurrentQueuedAsFractionOfHour}
    // //   handleIncreaseEstimate={this.handleIncreaseEstimate}
    // //   handleDecreaseEstimate={this.handleDecreaseEstimate}
    // //   handlecategoryOfQueuedOutcomeChosen={this.handlecategoryOfQueuedOutcomeChosen}
    // //   newCategoryText={this.state.newCategoryText}
    // //   handleNewCategory={this.handleNewCategory}
    // // />
    // // < StartButton
    // //
    // // />
    // </View>
    return (
      <View>
        <Text>ya grammy man</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // #37FF96
    alignItems: 'center',
    justifyContent: 'center',
  },

});
