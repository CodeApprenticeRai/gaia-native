import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Expo, { SQLite } from 'expo';

/*
TODO:
  1. Set Up The {Categories, OutcomeLog} Table in the Database, 0.50,
  2. Create a Basic Interface for the App { Current Outcome, Timer, Category Selection, Time Estimate in Blocks of 15mins, Start Button }, 0.50,
  3. Implement Steps to { Create, Display New Category Functionality, }, 0.50,
  4. Implement Steps to { Time Select Component }, 0.50,
  5. OnPress of Start Button, Timer Begins Counting Down from Time input found in Time Select Component that is non zero, and divisible by 15:
      A trigger is set for Time.now() + estimatedTime, for an sound to play, when that time is reached., 1.00,
  6. Current Outcome Header is Updated with the current Category as 'Current Priority: { $CurrentCategory }', 0.50,

*/

const db = SQLite.openDatabase('local.db');

function logIt(transaction, event){
  console.log(event);
}

export default class App extends React.Component {

  componentDidMount(){
    db.transaction( (tx) =>{

      tx.executeSql(`PRAGMA foreign_keys = ON;`, ()=>{}, logIt);

      tx.exectuteSql(`CREATE TABLE IF NOT EXISTS category (
        category_id INTEGER PRIMARY KEY UNIQUE,
        category_name UNIQUE NOT NULL,
      );`,  ()=>{}, logIt);

      tx.exectuteSql(`CREATE TABLE IF NOT EXISTS outcome_log (
        time_started INTEGER PRIMARY KEY UNIQUE NOT NULL,
        time_ended INTEGER UNIQUE NOT NULL,
        category_id INTEGER NOT NULL,
        time_estimated INTEGER NOT NULL,
        time_actual INTEGER NOT NULL,
        FOREIGN KEY( category_id ) REFERENCES category( category_id )
      );`,  ()=>{}, logIt);


    });

  }

  render() {
    return (
      <View style={styles.container}>
        <Text>I fw React-Native</Text>
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
