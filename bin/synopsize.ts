#!/usr/bin/env node
import * as optimist from 'optimist';
import {range, sample} from 'tarry';
import {Parser as JSONParser} from 'streaming/json';
import {Parser as SVParser} from '@chbrown/sv';

import {synopsize, ColumnSynopsis} from '../index';

interface Column {
  name: string;
  values: string[];
}

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

function consumeStream(inputStream: NodeJS.ReadableStream,
                       callback: (error: Error, columns?: Column[]) => void) {
  inputStream.once('readable', () => {
    const initialBytes = inputStream.read(100);
    inputStream.unshift(<any>initialBytes);
    if (initialBytes.toString().match(/^\s*\{/)) {
      // it's JSON
      const keySet = new Set<string>();
      const records: {[index: string]: any}[] = [];
      const parser = inputStream.pipe(new JSONParser());
      parser.on('error', error => callback(error))
      .on('data', record => {
        Object.keys(record).forEach(key => keySet.add(key));
        records.push(record);
      })
      .on('end', () => {
        const columns = [...keySet].map(name => {
          const values = records.map(record => {
            // use '' as the value for missing values for parity with SV
            if (record[name] === undefined || record[name] === null) {
              record[name] = '';
            }
            return String(record[name]);
          });
          return {name, values};
        });
        callback(null, columns);
      });
    }
    else {
      // it's CSV/TSV
      const records: {[index: string]: string}[] = [];
      // keep reference to parser available so that we have access to its inferences
      const parser = inputStream.pipe(new SVParser());
      parser.on('error', error => callback(error))
      .on('data', record => records.push(record))
      .on('end', () => {
        // TODO: customize sv.Parser so that we can get out string[] rows if we want
        const columns = parser.config.columns.map(name => {
          return {name, values: records.map(record => record[name])};
        });
        callback(null, columns);
      });
    }
  });
}

function main() {
  const argvparser = optimist
  .usage([
    'Usage: synopsize <my_data.csv',
    '       synopsize <apiRslt.json',
  ].join('\n'))
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
  const sampleLength: number = argv.sample;

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
    consumeStream(process.stdin, (error, columns) => {
      if (error) exit(error);

      columns.forEach((column, index) => {
        console.log(`[${index}] "${column.name}"`);
        const synopsis = synopsize(column.values);
        printSynopsis(synopsis, sampleLength);
      });
    });
  }
}

if (require.main === module) {
  main();
}
