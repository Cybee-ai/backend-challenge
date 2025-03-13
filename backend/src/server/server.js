import app from './app.js';

const start = async () => {
  try {

    if(process.env.DOCKER && process.env.DOCKER === "1"){
      console.log(`running on docker. Listening on port 3000. `)
      await app.listen({ port: 3000, host: '0.0.0.0'});
    } 
    else 
    {
      await app.listen({ port: 3000});
      console.log('running locally.')
      console.log('Server running on http://localhost:3000');
    }

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
