import React from 'react';
import { StyleSheet, Text, View, Picker, Button, TextInput, Alert } from 'react-native';
import Expo, { SQLite } from 'expo';


const db = SQLite.openDatabase('local.db');

const addCategorySQL = `INSERT INTO category( category_name ) VALUES ( ? );`;
const addOutcomeLogEntry = `INSERT INTO outcome_log( time_started, time_ended, category_id ) VALUES ( ?, ?, ? )`; // will need to stardardize time entries
const getLastNOutcomeLogEntries = `SELECT * FROM outcome_log ORDER BY time_started DESC LIMIT ?`;
const getAllCategories = `SELECT * FROM category`;
const getCategoryIdFromName = `SELECT * FROM category where lower(name)=lower(?)`;

const MAX_ALLOWED_ESTIMATE = 1;
const MIN_ALLOWED_ESTIMATE = 0;

function logIt(transaction, event){
  console.log(event);
}

function hourScaleToMilliSecondScale( timeAtHourScale ){
  return Math.round( timeAtHourScale * Math.pow( 3.6, 6) );
}


export default class App extends React.Component {
  constructor(props){
    super(props);

    this.state = {
      categories: [],
      newCategoryText: '',
      categoryOfQueuedOutcome: null,
      estimatedTimeOfQueuedOutcome: 0,
      displayedTimeMinutes: 0,
      displayedTimeSeconds: 0,
      idle: true

    }


    db.transaction( (tx) =>{

      tx.executeSql(`PRAGMA foreign_keys = ON;`, ()=>{}, logIt);
      // tx.executeSql(`DROP TABLE outcome_log`, ()=>{}, logIt);

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

      tx.executeSql( getAllCategories, [],
        ( this_transaction, results ) => {
            let stateCopy = this.state;
            stateCopy.categories = results.rows._array;
            // console.log( "Got some categories for ya:\n", stateCopy.categories );
            this.setState( stateCopy );
        });


      setInterval( () => { this.updateTimer()}, 1000 );
    });


    this.validateText = this.validateText.bind(this);
    this.handleNewCategory = this.handleNewCategory.bind(this);
    this.handlecategoryOfQueuedOutcomeChosen = this.handlecategoryOfQueuedOutcomeChosen.bind(this);
    this.handleIncreaseEstimate = this.handleIncreaseEstimate.bind(this);
    this.handleDecreaseEstimate = this.handleDecreaseEstimate.bind(this);
    this.handleStartOutcome = this.handleStartOutcome.bind(this);
    this.updateTimer = this.updateTimer.bind(this);
  }

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

            stateCopy.categories = results.rows._array;
            stateCopy.categoryOfQueuedOutcome = stateCopy.categories[0].category_id; // will break for new users

            this.setState( stateCopy );
        }

      )
    });
  }

  handlecategoryOfQueuedOutcomeChosen( categoryObj, index ){
    let stateCopy = this.state;
    stateCopy.categoryOfQueuedOutcome = categoryObj.category_id;
    this.setState( stateCopy );
  }

  // componentDidUpdate(){

    // reload categories from the database
  //   db.transaction( (tx) => {
  //     tx.executeSql( getAllCategories, [],
  //       ( this_transaction, results ) => {
  //           let stateCopy = this.state;
  //           stateCopy.categories = results.rows._array;
  //           this.setState( stateCopy );
  //       }
  //
  //     )
  //   });
  //
  // }

  handleIncreaseEstimate(){
    let stateCopy = this.state;

    if ( stateCopy.estimatedTimeOfQueuedOutcome < MAX_ALLOWED_ESTIMATE ){
      stateCopy.estimatedTimeOfQueuedOutcome += 0.25;
    }
    // else {} // do a neat animation that let's the user know that the max has been reached.

    this.setState( stateCopy );
  }


  handleDecreaseEstimate(){
    let stateCopy = this.state;

    if ( stateCopy.estimatedTimeOfQueuedOutcome > MIN_ALLOWED_ESTIMATE ){
      stateCopy.estimatedTimeOfQueuedOutcome -= 0.25;
    }
    // else {} // do a neat animation that let's the user know that the max has been reached.

    this.setState( stateCopy );
  }

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

      if ( this.state.displayedTimeMinutes == 0 ){

      } else {
          if ( this.state.displayedTimeSeconds == 0 ){
            stateCopy.displayedTimeMinutes -= 1;
            stateCopy.displayedTimeSeconds = 59;
          } else {
            stateCopy.displayedTimeSeconds -= 1;
          }
        }
    }

    this.setState( stateCopy );
  }

  handleStartOutcome(){
    // Is Time Non-Zero
    if ( this.state.estimatedTimeOfQueuedOutcome == 0 ){
      Alert.alert('Estimated Outcome Time Must Be Greater Than 00.00');
      return;
    }

    var date = new Date();
    let currentTime = date.getTime();
    let estimatedCompletionTime = currentTime + hourScaleToMilliSecondScale( this.state.estimatedTimeOfQueuedOutcome );

    console.log(`Current Time: ${currentTime}\nEstimated Completion Time: ${estimatedCompletionTime}\nCategory Id: ${this.state.categoryOfQueuedOutcome}`);


    // if ( this.state.idle )


    db.transaction( (tx) => {
      tx.executeSql( addOutcomeLogEntry, [ currentTime, estimatedCompletionTime,  this.state.categoryOfQueuedOutcome ], ()=>{}, logIt);

      tx.executeSql( getLastNOutcomeLogEntries, [ 5 ], ( this_transaction, results) =>{
        console.log(results);
      }, logIt);

    });


    let stateCopy = this.state;
    stateCopy.displayedTimeMinutes = 60 * this.state.estimatedTimeOfQueuedOutcome;
    stateCopy.estimatedTimeOfQueuedOutcome = 0;

    this.setState( stateCopy );

    setInterval( () => { this.updateTimer()}, 1000 );
  }




  componentDidMount(){}



  render() {
    const categoryPickerChoices = this.state.categories.map( ( categoryObj, indexInArray) => {
      return(
      < Picker.Item
        key={categoryObj.category_id}
        label={categoryObj.category_name}
        value={categoryObj}  // breaks: refreshes to an unselected picker item immediately after select, when should keep selected item
      />);
    });


    return (
      <View >
        <Text>Current Outcome: Creating App Version 1 < /Text>
        <Text style={{ textAlign: 'center', fontSize: 60 }}>{ this.state.idle ? '-': ''}{this.state.displayedTimeMinutes}:{this.state.displayedTimeSeconds}</Text>


        < Button title="˄" style={{ height: 50, width: 100 }}  onPress={this.handleIncreaseEstimate}/>

        <Picker
          style={{ height: 50, width: 100 }}
          onValueChange={this.handlecategoryOfQueuedOutcomeChosen}
        >
          { categoryPickerChoices }
        </Picker>


        < TextInput
          style={{height: 40, borderColor: 'gray', borderWidth: 1}}
          onChangeText={(newCategoryText) => this.setState({newCategoryText})}
          placeholder='Enter New Category'
          value={this.state.newCategoryText}
        />
        <Button
          title=" + "
          onPress={this.handleNewCategory}
        />


        <Text>{ '0' + Number(this.state.estimatedTimeOfQueuedOutcome).toFixed(2) }</Text>
        < Button title="˅" style={{ height: 50, width: 100 }} onPress={ this.handleDecreaseEstimate } />

        < Button title="START" onPress={this.handleStartOutcome} />


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
