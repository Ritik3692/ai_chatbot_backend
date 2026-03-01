import { Request } from 'express';

/**
 * Generic helper to type Express Requests.
 * TBody: Type for req.body
 * TQuery: Type for req.query
 * TParams: Type for req.params
 */
export interface TypedRequest<
    TBody = any,
    TQuery = any,
    TParams = any,
> extends Request {
    body: TBody;
    query: TQuery & Request['query'];
    params: TParams & Request['params'];
}
