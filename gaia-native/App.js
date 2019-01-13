import React from 'react';
import { StyleSheet, Text, View, Picker, Button, TextInput, Alert } from 'react-native';
import  DialogInput from 'react-native-dialog-input'
import Expo, { SQLite } from 'expo';

const db = SQLite.openDatabase('local.db');
const getAllCategories = `SELECT * FROM category WHERE category_id > 1;`;
const addCategorySQL = `INSERT INTO category( category_name ) SELECT ? WHERE NOT EXISTS( SELECT 1 FROM category WHERE category_name=? );`; //`INSERT INTO category( category_name ) VALUES ( ? );`;
const getCategoryFromName = `SELECT * FROM category where lower(name)=lower(?)`;
const addOutcomeLogEntry = `INSERT INTO outcome_log( time_started, time_ended, outcome_title, category_id ) VALUES ( ?, ?, ?, ? )`; // will need to stardardize time entries
const getLastNOutcomeLogEntries = `SELECT * FROM outcome_log ORDER BY time_started DESC LIMIT ?`;

const MAX_ALLOWED_ESTIMATE = 1;
const MIN_ALLOWED_ESTIMATE = 0;

function logIt(transaction, event){
  console.log(event);
}

//no numbers, max 2 spaces, no special chars / punctuation
function validateText(text){
  return true;
}


/*
Tasks:
  1.1 Can Create New Category By Entering it into a Input Area,
    1.2. Can Create New Category From a Modal, 1,

  2. Can Create a new Outcome by entering it into an Input Area, 1,

  3. Can Start a New Outcome,
    New Outcome Posted with correct times,
    On TimeOver: Idle
    !!!!On New Outcome Started after Idle: Post CurrentTime - EstimatedEndOfCurrentOutcome as Idle Entry
    After NewOutcomeStartedAfterIdle POST IDLE TIIME, 1,

  Can Display TimeLeft,1,
  Can Display TimeOver,1,

  Shows Current { Category, Outcome }, 1,

  4. Styling ...


*/

class CurrentOutcomeHeader extends React.Component {

  render(){

    return(
      <Text
        style={styles.currentOutcomeHeader}
      >
        { this.props.currentOutcome != null ? this.props.currentOutcome.category_name  + ": " + this.props.currentOutcomeTitle : 'Trading and Investments: Write Moving Average Convergence Divergence Algorithm' }
      </Text>
    )
  }
}

class TimerDisplay extends React.Component{
  render(){
    var minutes = Math.floor( Math.abs(this.props.estimatedCompletionTimeOfCurrentOutcome - this.props.currentTime) / (1000 * 60)  );


    if ( ( Math.abs( this.props.estimatedCompletionTimeOfCurrentOutcome - this.props.currentTime ) / (1000 * 60) ) < 10){
      minutes = '0'  + minutes;
    }

    if ( ( ( this.props.estimatedCompletionTimeOfCurrentOutcome - this.props.currentTime ) / (1000 * 60) ) < 0){
      minutes = '-' + minutes;
    }

    var seconds = Math.abs( Math.round( ( (this.props.estimatedCompletionTimeOfCurrentOutcome - this.props.currentTime) / (1000)  ) % 60 ) );

    if ( seconds < 10){
      seconds = '0'  + seconds;
    }

    return(
      <Text
        style={styles.timerDisplay}
      >
      { minutes + ':' + seconds }
      </Text>
    )
  }
}

class StartButton extends React.Component {

  render(){
    return(
      < Button
        style={styles.startButton}
        title="START"
        onPress={this.props.handleStartOutcome}
      />
    );
  }
}

class NewOutcomeInputGroup extends React.Component {
  componentDidMount(){
  }

  render(){
    var categoriesAsPickerItems = this.props.categories.map( ( categoryObj, indexInArray) => {
      return(
        < Picker.Item
        key={categoryObj.category_id}
        label={categoryObj.category_name}
        value={categoryObj}  // breaks: refreshes to an unselected picker item immediately after select, when should keep selected item
        /> );
      });

    // selectedValue={}
    // style={}
    // onValueChange={}

    // <Picker.Item label='Example' value='exmaple' />
    return(
      <View
        style={styles.newOutcomeInputGroup}
      >

            < Button title="˄"  onPress={this.props.handleIncreaseEstimate}/>

            <Picker
               style={styles.pickerGroup}
               onValueChange={ (itemValue, itemIndex) => { this.props.handleCategorySelected(itemValue, itemIndex) } }
             >
             { categoriesAsPickerItems  }
             <Picker.Item label='Create New Category' value='new' />
            </Picker>

            <TextInput
             placeholder='Title of Outcome'
             onChangeText={ (text) => { this.props.setTitleOfQueuedOutcome(text) } }
            />


             <Text
             style={styles.estimateText}
             >
             { '0' + Number(this.props.estimatedDurationOfQueuedOutcome).toFixed(2) }
             </Text>


             < Button title="˅"  onPress={ this.props.handleDecreaseEstimate } />

      </View>
    );
  }
}

export default class App extends React.Component {
  constructor(props){
    super(props);

    this.state = {

      currentOutcome: null,
      currentOutcomeTitle: null,
      currentTime: null,
      startTimeOfCurrentOutcome: null,
      estimatedCompletionTimeOfCurrentOutcome: null,



      categories: [],
      // createNewCategoryFormIsVisible: false,
      // newCategoryName: '',

      queuedCategory: null, // is an object
      titleOfQueuedOutcome: null,
      estimatedDurationOfQueuedOutcome: 0, // is 1 = 1 hr
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
        outcome_title TEXT,
        category_id INTEGER NOT NULL,
        FOREIGN KEY( category_id ) REFERENCES category( category_id )
      );`, [], ()=>{}, logIt);

      tx.executeSql( getAllCategories, [],
        ( this_transaction, results ) => {
            let stateCopy = this.state;
            stateCopy.categories = results.rows._array;

            // stateCopy.categoriesMap = results.rows._array.reduce( ( map, categoryObj) => {
              // map[categoryObj.category_id] = categoryObj;
              // return map
            // }, {});

            this.setState( stateCopy );
      });
    });

    this.handleIncreaseEstimate = this.handleIncreaseEstimate.bind(this);
    this.handleDecreaseEstimate = this.handleDecreaseEstimate.bind(this);
    this.handleCategorySelected = this.handleCategorySelected.bind(this);
    // this.makeCreateNewCategoryFormVisble = this.makeCreateNewCategoryFormVisble.bind(this);
    this.getCategoriesFromDatabase = this.getCategoriesFromDatabase.bind(this);

    this.setTitleOfQueuedOutcome = this.setTitleOfQueuedOutcome.bind(this);

    this.handleStartOutcome = this.handleStartOutcome.bind(this);
  }

  getCategoriesFromDatabase(){
        db.transaction( (tx) =>{
          tx.executeSql( getAllCategories, [],
            ( this_transaction, results ) => {
                let stateCopy = this.state;
                stateCopy.categories = results.rows._array;
                // stateCopy.categoriesMap = results.rows._array.reduce( ( map, categoryObj) => {
                  // map[categoryObj.category_id] = categoryObj;
                  // return map
                // }, {});
                this.setState( stateCopy );
          });
        });
  }
  handleCategorySelected(itemValue, itemIndex){
    //change queued category to whatever is selected
    let stateCopy = this.state;
    /*
      If the item value is new, we want to make the modal visible,
      so that we can take in a new category
    */
    stateCopy.queuedCategory = itemValue;
    this.setState( stateCopy );
  }
  createNewCategory( categoryName ){
      let proceed = validateText( categoryName );
      if (proceed){
        db.transaction( (tx) => {
          tx.executeSql( addCategorySQL, [ categoryName ], ()=>{}, logIt );
          // tx.executeSql( getCategoryFromName, [ categoryName ], ( _tx, results)=>{
          // }, logIt );

          let stateCopy = this.state;
          stateCopy.queuedCategory = null; // to disable DialogInput Visibility
          this.setState( stateCopy );
        });
      } else {
        Alert.alert('Category text doesnt check out.');
      }


      this.getCategoriesFromDatabase(); // to refresh categories
  }
  setTitleOfQueuedOutcome( newOutcomeTitle ){
    let stateCopy = this.state;
    stateCopy.titleOfQueuedOutcome = newOutcomeTitle;

    this.setState( stateCopy );
  }
  handleIncreaseEstimate(){
    let stateCopy = this.state;

    if ( stateCopy.estimatedDurationOfQueuedOutcome < MAX_ALLOWED_ESTIMATE ){
      stateCopy.estimatedDurationOfQueuedOutcome += 0.25;
    }
    // else {} // do a neat animation that let's the user know that the max has been reached.

    this.setState( stateCopy );
  }
  handleDecreaseEstimate(){
    let stateCopy = this.state;

    if ( stateCopy.estimatedDurationOfQueuedOutcome > MIN_ALLOWED_ESTIMATE ){
      stateCopy.estimatedDurationOfQueuedOutcome -= 0.25;
    }
    // else {} // do a neat animation that let's the user know that the max has been reached.

    this.setState( stateCopy );
  }
  handleStartOutcome(){
    if ( typeof(this.state.queuedCategory) != typeof(this.state.categories[0]) ){
      alert( 'Choose a Category');
      return;
    } else if ( this.state.estimatedDurationOfQueuedOutcome <= 0 ){
      alert( 'Set an Estimate');
      return;
    } else {
      let date = new Date();
      let currentTime = date.getTime();
      if ( this.state.currentTime > this.state.estimatedCompletionTimeOfCurrentOutcome ){ // create an outcome entry for idle
        db.transaction( (tx) => {
          tx.executeSql( addOutcomeLogEntry, [ this.state.estimatedCompletionTimeOfCurrentOutcome, currentTime, 'Idle', 1], ()=>{}, logIt)
        });
      }

      db.transaction( (tx) => {
        let stateCopy = this.state;

        stateCopy.currentOutcome = this.state.queuedCategory;
        stateCopy.currentOutcomeTitle = this.state.titleOfQueuedOutcome;
        stateCopy.startTimeOfCurrentOutcome = currentTime;
        stateCopy.estimatedCompletionTimeOfCurrentOutcome = currentTime + this.state.estimatedDurationOfQueuedOutcome * 3600 * 1000;


        tx.executeSql( addOutcomeLogEntry, [ currentTime, stateCopy.estimatedCompletionTimeOfCurrentOutcome, stateCopy.currentOutcomeTitle, stateCopy.currentOutcome.category_id ], ()=>{}, logIt);


        tx.executeSql( getLastNOutcomeLogEntries, [ 100 ], ( this_transaction, results) =>{
          console.log(results);
        }, logIt);

        stateCopy.queuedCategory = null;
        stateCopy.titleOfQueuedOutcome = null;
        stateCopy.estimatedDurationOfQueuedOutcome = 0;

        this.setState( stateCopy );
      });

    }
  }
  componentDidMount(){
    this.timeKeeper = setInterval( () => {
      let stateCopy = this.state;
      var date = new Date();
      let currentTime = date.getTime();
      stateCopy.currentTime = currentTime;

      if (this.state.estimatedCompletionTimeOfCurrentOutcome == null ){
        stateCopy.estimatedCompletionTimeOfCurrentOutcome = currentTime;
      }
      if (this.state.startTimeOfCurrentOutcome == null){
        stateCopy.startTimeOfCurrentOutcome = currentTime;
      }

      this.setState( stateCopy );
    }, 1000);
  }
  componentWillUnmount(){
    clearInterval(this.timeKeeper);
  }

  render(){
    return(
      <View style={styles.container}>
          <CurrentOutcomeHeader
            currentOutcome={this.state.currentOutcome}
            currentOutcomeTitle={this.state.currentOutcomeTitle}
          />

          <TimerDisplay
            currentTime={this.state.currentTime }
            estimatedCompletionTimeOfCurrentOutcome={this.state.estimatedCompletionTimeOfCurrentOutcome}
          />


          <NewOutcomeInputGroup
            estimatedDurationOfQueuedOutcome={this.state.estimatedDurationOfQueuedOutcome}
            handleIncreaseEstimate={this.handleIncreaseEstimate}
            handleDecreaseEstimate={this.handleDecreaseEstimate}
            categories={this.state.categories}
            handleCategorySelected={this.handleCategorySelected}
            queuedCategory={this.state.queuedCategory}
            newCategoryName={this.state.newCategoryName}
            setTitleOfQueuedOutcome={this.setTitleOfQueuedOutcome}

          />

          <StartButton
            handleStartOutcome={this.handleStartOutcome}
          />


          <DialogInput
            isDialogVisible={typeof(this.state.queuedCategory) == typeof('new')}
            title={'New Category'}
            hintInput={'Enter New Category'}
            submitInput={ (inputText) => { this.createNewCategory(inputText) } }
            closeDialog={ () => { this.showDialog(false) } }
          >
          </DialogInput>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 25,
    // backgroundColor: '#fff', // #37FF96
    // alignItems: 'center',
    // justifyContent: 'center',
    paddingHorizontal: 10,
    // backgroundColor: '#16a1f7',
  },
  currentOutcomeHeader:{
    textAlign: 'center',
    fontSize: 20,
    maxHeight: 65,
    paddingBottom: 10,
    paddingHorizontal: 10,
    // flex: 1/12,
  },
  pickerGroup: {
    borderWidth: 1
  },
  timerDisplay:{
    textAlign: 'center',
    borderRadius: 10,
    borderWidth: 5,
    fontSize: 85,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  startButton: {
    // flex: 1,
    // height: 50,
    // width: 10
    minHeight: 80,
  },
  newOutcomeInputGroup: {
    backgroundColor: '#fff',
    marginBottom: 5
  },
  estimateText: {
    // flex: 1,
    // alignItems: 'center',
    textAlign: 'center',
    // fontSize: 50,
    borderRadius: 1,
    borderColor: '#000',
    borderWidth: 1
  }

});
