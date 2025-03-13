import Source from "../data/models/Source.js"

const seedDb = async () => {
    try {  
        
      const newSource = {
        id: 'bff552d1-4ac2-45f8-8ffe-a09accfd0d26',
        sourceType: 'google_workspace',
        credentials: JSON.stringify({
          clientEmail: 'string',
          privateKey: 'string',
          scopes: ['admin.googleapis.com']
        }),
        logFetchInterval: 300,
        callbackUrl: process.env.CALLBACK_API_HOOK
      };
  
      // Check if source exists, if not, insert it
      await Source.findOneAndDelete({ id: newSource.id });
  
      const source = new Source(newSource);
      await source.save();
      console.log('Source saved successfully!');

      const expireSource = {
        id: '0e40ca89-cd9a-4c21-b131-f3b0e4ea4666',
        sourceType: 'google_workspace',
        credentials: JSON.stringify({
          clientEmail: 'string',
          privateKey: 'string',
          scopes: ['admin.googleapis.com']
        }),
        logFetchInterval: 300,
        callbackUrl: process.env.CALLBACK_API_HOOK
      };

      await Source.findOneAndDelete({ id: expireSource.id });

      const expireSourceEntity = new Source(expireSource);
      await expireSourceEntity.save();
      console.log('Source saved successfully!');

      
    } catch (err) {
      console.error('Error:', err);
    }
  };
  

export default seedDb;