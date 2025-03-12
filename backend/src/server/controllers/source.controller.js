import Source from '../../data/models/Source.js';

export const addSource = async (request, reply) => {
    const body = request.body;

    const sourceExists = await Source.exists({id:body.id});
    if(sourceExists){
        throw new Error('An item with this id already exists');
    }

    const newSource = new Source({id:body.id, sourceType: body.sourceType, callbackUrl: body.callbackUrl, logFetchInterval: body.logFetchInterval, credentials: JSON.stringify(body.credentials)});
    await newSource.save();

    return reply.send({
        message:'source added'
    });
};
  

export const removeSource = async (request, reply) => {
    const {id} = request.params;
    const source = await Source.findOne({  id });

    if(!source){
        throw new Error('No source with this id exists');
    }

    await Source.deleteOne({id})

    return {message: 'source removed'};
}

export const getActiveSources = async (request, reply) => {
    const sources = await Source.find();

    const transformedSources = sources.map(source => {
        try {
            return {
                id: source.id,
                sourceType: source.sourceType,
                logFetchInterval: source.logFetchInterval,
                callbackUrl: source.callbackUrl,
                // credentials: JSON.parse(source.getDecryptedData())
            }

        } catch {
            return {
                id: source.id,
                sourceType: source.sourceType,
                logFetchInterval: source.logFetchInterval,
                callbackUrl: source.callbackUrl,
                // credentials: source.getDecryptedData()
            }
        }
    });
    
   return reply
    .code(200)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send(transformedSources)
};
