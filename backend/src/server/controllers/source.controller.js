import Source from '../../data/models/Source.js';
import { checkCredentialsExpired } from '../utils/credentials.service.js';

export const addSource = async (request, reply) => {
    const body = request.body;

    const sourceExists = await Source.exists({ id: body.id });
    if (sourceExists) {
        return reply.code(409).send({
            message: 'Source already exists'
        });
    }

    // validate credentials before storing them
    const validated = await checkCredentialsExpired(body.credentials)
    if(!validated.error){
        return reply.code(400).send({
            message: 'Credentials don`t appear to be valid',
            error: validated.error
        });    
    }

    const newSource = new Source({id:body.id, sourceType: body.sourceType, callbackUrl: body.callbackUrl, logFetchInterval: body.logFetchInterval, credentials: JSON.stringify(body.credentials)});
    await newSource.save();

    return reply.send({
        message:'source added'
    });
};
  

// eslint-disable-next-line no-unused-vars
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
    const sources = await Source.find({ expired: false });

    const transformedSources = sources.map(source => {
        try {
            return {
                id: source.id,
                sourceType: source.sourceType,
                logFetchInterval: source.logFetchInterval,
                callbackUrl: source.callbackUrl,
            }

        } catch {
            return {
                id: source.id,
                sourceType: source.sourceType,
                logFetchInterval: source.logFetchInterval,
                callbackUrl: source.callbackUrl,
            }
        }
    });
    
   return reply
    .code(200)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send(transformedSources)
};
