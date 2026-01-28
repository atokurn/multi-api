/**
 * Swagger/OpenAPI Configuration
 */

const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'DramaWave API',
        version: '1.0.0',
        description: 'Drama streaming API with full episode access via proxy',
        contact: {
            name: 'DramaWave API'
        }
    },
    servers: [
        {
            url: 'https://dramawave-api.vercel.app',
            description: 'Production'
        },
        {
            url: 'http://localhost:3000',
            description: 'Development'
        }
    ],
    tags: [
        { name: 'General', description: 'Health and status endpoints' },
        { name: 'Feed', description: 'Content feed endpoints' },
        { name: 'Drama', description: 'Drama detail and episodes' },
        { name: 'V2', description: 'Full episode access via proxy' }
    ],
    paths: {
        '/': {
            get: {
                tags: ['General'],
                summary: 'Health check',
                responses: {
                    '200': {
                        description: 'API status',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string', example: 'DramaWave API' },
                                        version: { type: 'string', example: '1.0.0' },
                                        status: { type: 'string', example: 'running' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/dramawave/home': {
            get: {
                tags: ['Feed'],
                summary: 'Get home feed',
                responses: {
                    '200': { description: 'Home feed data', content: { 'application/json': { schema: { $ref: '#/components/schemas/FeedResponse' } } } }
                }
            }
        },
        '/api/dramawave/foryou': {
            get: {
                tags: ['Feed'],
                summary: 'Get For You recommendations',
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
                ],
                responses: {
                    '200': { description: 'Recommended dramas', content: { 'application/json': { schema: { $ref: '#/components/schemas/FeedResponse' } } } }
                }
            }
        },
        '/api/dramawave/trending': {
            get: {
                tags: ['Feed'],
                summary: 'Get trending dramas',
                responses: {
                    '200': { description: 'Trending dramas', content: { 'application/json': { schema: { $ref: '#/components/schemas/FeedResponse' } } } }
                }
            }
        },
        '/api/dramawave/search': {
            get: {
                tags: ['Feed'],
                summary: 'Search dramas',
                parameters: [
                    { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Search keyword' }
                ],
                responses: {
                    '200': { description: 'Search results', content: { 'application/json': { schema: { $ref: '#/components/schemas/FeedResponse' } } } }
                }
            }
        },
        '/api/dramawave/detail/{id}': {
            get: {
                tags: ['Drama'],
                summary: 'Get drama details',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Drama ID' }
                ],
                responses: {
                    '200': { description: 'Drama details', content: { 'application/json': { schema: { $ref: '#/components/schemas/DramaDetail' } } } }
                }
            }
        },
        '/api/dramawave/dramas/{id}/play/{episode}': {
            get: {
                tags: ['Drama'],
                summary: 'Play episode by index',
                description: 'Get video URL for specific episode. Uses v2 for full access.',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Drama ID' },
                    { name: 'episode', in: 'path', required: true, schema: { type: 'integer' }, description: 'Episode number (1-based)' }
                ],
                responses: {
                    '200': { description: 'Episode with video URL', content: { 'application/json': { schema: { $ref: '#/components/schemas/PlayResponse' } } } }
                }
            }
        },
        '/api/dramawave/v2/detail/{id}': {
            get: {
                tags: ['V2'],
                summary: 'Get full drama details',
                description: 'Returns all 81 episodes with video URLs via proxy',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Drama ID (e.g. xuyr3DtXPt)' }
                ],
                responses: {
                    '200': {
                        description: 'Full drama with all episodes',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/V2DetailResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/api/dramawave/v2/play/{id}/{episode}': {
            get: {
                tags: ['V2'],
                summary: 'Play any episode',
                description: 'Get video URL for ANY episode (including VIP). Cached for 1 hour.',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Drama ID' },
                    { name: 'episode', in: 'path', required: true, schema: { type: 'integer' }, description: 'Episode number (1-81)' }
                ],
                responses: {
                    '200': { description: 'Episode with video URL', content: { 'application/json': { schema: { $ref: '#/components/schemas/V2PlayResponse' } } } }
                }
            }
        },
        '/api/dramawave/v2/stats': {
            get: {
                tags: ['V2'],
                summary: 'Get rate limit stats',
                description: 'View Redis cache status and rate limit counters',
                responses: {
                    '200': {
                        description: 'Stats',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        stats: {
                                            type: 'object',
                                            properties: {
                                                connected: { type: 'boolean' },
                                                storage: { type: 'string', example: 'redis' },
                                                rateLimit: {
                                                    type: 'object',
                                                    properties: {
                                                        requestsToday: { type: 'integer' },
                                                        remainingDay: { type: 'integer' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    components: {
        schemas: {
            FeedResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Drama' }
                    },
                    pagination: {
                        type: 'object',
                        properties: {
                            hasMore: { type: 'boolean' },
                            total: { type: 'integer' }
                        }
                    }
                }
            },
            Drama: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    key: { type: 'string' },
                    title: { type: 'string' },
                    cover: { type: 'string' },
                    description: { type: 'string' },
                    episodeCount: { type: 'integer' }
                }
            },
            DramaDetail: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Drama' }
                }
            },
            PlayResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: {
                        type: 'object',
                        properties: {
                            episodeId: { type: 'string' },
                            episodeIndex: { type: 'integer' },
                            videoUrl: { type: 'string' },
                            name: { type: 'string' }
                        }
                    }
                }
            },
            V2DetailResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    source: { type: 'string', example: 'redis_cache' },
                    data: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            episodeCount: { type: 'integer' },
                            episodes: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/Episode' }
                            }
                        }
                    }
                }
            },
            V2PlayResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    source: { type: 'string' },
                    data: { $ref: '#/components/schemas/Episode' }
                }
            },
            Episode: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    index: { type: 'integer' },
                    name: { type: 'string' },
                    unlock: { type: 'boolean' },
                    videoUrl: { type: 'string' }
                }
            }
        }
    }
};

export default swaggerDocument;
