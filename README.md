# Medigo Query

This program run query on mongoDB database to list schedules of given doctor's id and desired date. 

## Setting Up
1. Installing the dependencies

```
npm install
```

2. Change the database URL in the `config.json` if needed.

3. If the data is yet unavailable, create dummy data.

```
node createDummy
```

## Running
The query function can be called through cli using syntax as following :

```
node index <QUERY_STRING> [<OPTIONS>]
```

- `QUERY_STRING` contains the javascript object acting as query.
- `OPTIONS` contains optional variable to set particular parameter while running the command. Available `OPTIONS` :
   - `--verbose` - to activate debug logging