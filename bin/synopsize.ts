#!/usr/bin/env node
import * as optimist from 'optimist';
import {range, sample} from 'tarry';
import {Parser} from 'sv';

import {synopsize, ColumnSynopsis} from '../index';

function exit(error?: Error) {
  if (error) {
    console.error(`ERROR: ${error.toString()}`);
    process.exit(1);
  }
  console.error('DONE');
  process.exit(0);
}

function printCounts<T>(counts: Map<T, number>, sampleLength: number, showCount = true) {
  const uniqueValues = Array.from(counts.keys());
  // if there aren't many unique values, print them all
  const isSample = uniqueValues.length > sampleLength;
  const values = isSample ? sample(uniqueValues, sampleLength) : uniqueValues;
  if (isSample) {
    console.log(`  ${sampleLength} random examples:`);
  }
  for (let value of values) {
    if (showCount) {
      const count = counts.get(value);
      console.log(`    ${value}: ${count}`);
    }
    else {
      console.log(`    ${value}`);
    }
  }
}

function printSynopsis<T>(synopsis: ColumnSynopsis<T>, sampleLength: number) {
  const {typeName, values, nonEmptyValues, minimum, maximum, counts} = synopsis;
  console.log(`  Type: ${typeName}`);
  // print totals summary
  const hasEmptyValues = nonEmptyValues.length < values.length;
  if (hasEmptyValues) {
    const totalEmptyValues = values.length - nonEmptyValues.length;
    const emptyValuesRatio = totalEmptyValues / values.length;
    console.log(`  ${totalEmptyValues} missing values (out of ${values.length} total), or ${(emptyValuesRatio * 100).toFixed(2)}%`);
  }
  else {
    console.log(`  No missing values (${values.length} total)`);
  }
  const valueRef = hasEmptyValues ? '(non-null) value' : 'value';
  // print values / counts summary
  // We want to avoid printing too many values -- that's not a synopsis.
  // But we don't want to assume that all numeric values are continuous,
  // or to show _only_ aggregate statistics.
  if (nonEmptyValues.length === 0) {
    // redundant (remove?)
    console.log('  No values to show');
  }
  else if (counts.size === 1) {
    console.log(`  There is only one unique ${valueRef}: ${minimum}`);
  }
  else if (counts.size === nonEmptyValues.length) {
    console.log(`  All ${valueRef}s are unique and range from ${minimum} to ${maximum}`);
    printCounts(counts, sampleLength, false);
  }
  else {
    // the values aren't all unique
    console.log(`  There are ${counts.size} unique ${valueRef}s, which range from ${minimum} to ${maximum}`);
    printCounts(counts, sampleLength);

  }
}

function synopsizeStream(inputStream: NodeJS.ReadableStream, sampleLength: number) {
  const records: {[index: string]: string}[] = [];
  // keep reference to parser available so that we have access to its inferences
  const parser = inputStream.pipe(new Parser());
  parser.on('error', error => exit(error))
  .on('data', record => records.push(record))
  .on('end', () => {
    // TODO: customize sv.Parser so that we can get out string[] rows if we want
    const columns = parser.config.columns; // Object.keys(records[0]);
    columns.forEach((column, index) => {
      console.log(`[${index}] "${column}"`);
      const values = records.map(record => record[column]);
      const synopsis = synopsize(values);
      printSynopsis(synopsis, sampleLength);
    });
  });
}

function main() {
  const argvparser = optimist
  .usage('Usage: synopsize <my_data.csv')
  .options({
    help: {
      alias: 'h',
      describe: 'print this help message',
      type: 'boolean',
    },
    version: {
      describe: 'print version',
      type: 'boolean',
    },
    sample: {
      describe: 'maximum number of example values to show for each column',
      type: 'number',
      default: 10,
    },
  });

  const argv = argvparser.argv;

  if (argv.help) {
    argvparser.showHelp();
  }
  else if (argv.version) {
    console.log(require('../package').version);
  }
  else if (process.stdin['isTTY']) {
    exit(new Error('Data must be piped in on STDIN'));
  }
  else {
    synopsizeStream(process.stdin, argv.sample);
  }
}

if (require.main === module) {
  main();
}
