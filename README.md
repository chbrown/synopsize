## synopsize

[![npm version](https://badge.fury.io/js/synopsize.svg)](https://www.npmjs.com/package/synopsize)

Summarize tables of structured data, such as CSV or JSON!

    $ npm install -g synopsize

Example, using [Capital Metro](https://data.texas.gov/capital-metro)'s [`fare_rules.txt`](https://developers.google.com/transit/gtfs/reference#fare_rulestxt):

    $ synopsize < fare_rules.txt
    [0] "fare_id"
      Type: TEXT
      No missing values (83 total)
      There are 3 unique values, which range from a to c
        a: 63
        b: 11
        c: 9
    [1] "route_id"
      Type: INTEGER
      No missing values (83 total)
      All values are unique and range from 1 to 990
      10 random examples:
        982
        987
        985
        983
        7
        935
        681
        803
        801
        663
    [2] "origin_id"
      Type: TEXT
      83 missing values (out of 83 total), or 100.00%
      No values to show
    [3] "destination_id"
      Type: TEXT
      83 missing values (out of 83 total), or 100.00%
      No values to show
    [4] "contains_id"
      Type: TEXT
      83 missing values (out of 83 total), or 100.00%
      No values to show


### To-do

* [x] Support newline-delimited JSON as input
* [ ] Infer more complex types
  - [ ] come up with better names / descriptions
  - [x] custom sort (`compareFunction`) for each type
* [ ] Draw histograms for continuous types
* [ ] Smarter examples when showing random samples
* [ ] Add option to sort by count instead of value
* [ ] Width-aware padded output, especially for long values and the _value_: _count_ tables
* [ ] Generalize for CLI / web consumption


## License

Copyright 2016 Christopher Brown. [MIT Licensed](http://chbrown.github.io/licenses/MIT/#2016)
