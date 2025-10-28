import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

import * as amazonPaapi from 'amazon-paapi';

export class AmazonPA implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Amazon PA API',
        name: 'amazonPA',
        icon: 'file:amazon.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Interact with Amazon Product Advertising API',
        defaults: {
            name: 'Amazon PA API',
            color: '#FF9900',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'amazonPaApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                    {
                        name: 'Search Items',
                        value: 'searchItems',
                        description: 'Search for items on Amazon',
                    },
                    {
                        name: 'Get Items',
                        value: 'getItems',
                        description: 'Get item information by ASIN',
                    },
                    {
                        name: 'Get Browse Nodes',
                        value: 'getBrowseNodes',
                        description: 'Get browse node information',
                    },
                ],
                default: 'searchItems',
            },
            {
                displayName: 'Partner Tag',
                name: 'partnerTag',
                type: 'string',
                default: '',
                description: 'Amazon Partner Tag (overrides default if set)',
            },
            {
                displayName: 'Item IDs (for Get Items)',
                name: 'itemIds',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['getItems'],
                    },
                },
                default: '',
                description: 'Comma-separated list of ASINs for items',
            },
            {
                displayName: 'Keywords (for Search Items)',
                name: 'keywords',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['searchItems'],
                    },
                },
                default: '',
                description: 'Keywords to search for items on Amazon',
            },
            {
                displayName: 'Browse Node IDs (for Get Browse Nodes)',
                name: 'browseNodeIds',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['getBrowseNodes'],
                    },
                },
                default: '',
                description: 'Comma-separated list of Browse Node IDs',
            },
            {
                displayName: 'Resources',
                name: 'resources',
                type: 'multiOptions',
                displayOptions: {
                    show: {
                        operation: ['getItems', 'searchItems'],
                    },
                },
                options: [
                    {
                        name: 'Images.Primary.Small',
                        value: 'Images.Primary.Small',
                    },
                    {
                        name: 'Images.Primary.Medium',
                        value: 'Images.Primary.Medium',
                    },
                    {
                        name: 'Images.Primary.Large',
                        value: 'Images.Primary.Large',
                    },
                    {
                        name: 'ItemInfo.Title',
                        value: 'ItemInfo.Title',
                    },
                    {
                        name: 'ItemInfo.Features',
                        value: 'ItemInfo.Features',
                    },
                    {
                        name: 'ItemInfo.ContentInfo',
                        value: 'ItemInfo.ContentInfo',
                    },
                    {
                        name: 'ItemInfo.ManufactureInfo',
                        value: 'ItemInfo.ManufactureInfo',
                    },
                    {
                        name: 'ItemInfo.ProductInfo',
                        value: 'ItemInfo.ProductInfo',
                    },
                    {
                        name: 'ItemInfo.TechnicalInfo',
                        value: 'ItemInfo.TechnicalInfo',
                    },
                    {
                        name: 'Offers.Listings.Availability.Message',
                        value: 'Offers.Listings.Availability.Message',
                    },
                    {
                        name: 'Offers.Listings.Availability.MaxOrderQuantity',
                        value: 'Offers.Listings.Availability.MaxOrderQuantity',
                    },
                    {
                        name: 'Offers.Listings.Condition',
                        value: 'Offers.Listings.Condition',
                    },
                    {
                        name: 'Offers.Listings.Price',
                        value: 'Offers.Listings.Price',
                    },
                    {
                        name: 'Offers.Listings.DeliveryInfo',
                        value: 'Offers.Listings.DeliveryInfo',
                    },
                    {
                        name: 'Offers.Listings.MerchantInfo',
                        value: 'Offers.Listings.MerchantInfo',
                    },
                    {
                        name: 'Offers.Summaries.HighestPrice',
                        value: 'Offers.Summaries.HighestPrice',
                    },
                    {
                        name: 'Offers.Summaries.LowestPrice',
                        value: 'Offers.Summaries.LowestPrice',
                    },
                    {
                        name: 'ParentASIN',
                        value: 'ParentASIN',
                    },
                ],
                default: [
                    'Images.Primary.Medium',
                    'ItemInfo.Title',
                    'Offers.Listings.Price',
                ],
                description: 'Resources to retrieve from Amazon PA API',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        // Retrieve credentials
        const credentials = await this.getCredentials('amazonPaApi');
        
        // Get partnerTag either from the input or from the credentials
        const partnerTag = this.getNodeParameter('partnerTag', 0, '') as string || credentials.partnerTag;
        
        // Ensure PartnerTag exists
        if (!partnerTag) {
            throw new Error('PartnerTag is required but was not provided in both the request and credentials.');
        }

        const commonParameters = {
            AccessKey: credentials.accessKey as string,
            SecretKey: credentials.secretKey as string,
            PartnerTag: partnerTag,  // Use provided PartnerTag or default from credentials
            Marketplace: credentials.marketplace as string,
            PartnerType: 'Associates',
        };

        // Loop through each item
        for (let i = 0; i < items.length; i++) {
            let responseData;
            const requestParameters: any = {};

            try {
                const operation = this.getNodeParameter('operation', i) as string;

                if (operation === 'getItems') {
                    // Handling Get Items request
                    const itemIds = this.getNodeParameter('itemIds', i) as string | null;

                    if (itemIds) {
                        requestParameters.ItemIds = itemIds.includes(',') ? itemIds.split(',') : [itemIds];
                    } else {
                        throw new Error('Item IDs are required but were not provided.');
                    }

                    // Add Resources parameter if specified
                    const resources = this.getNodeParameter('resources', i, []) as string[];
                    if (resources && resources.length > 0) {
                        requestParameters.Resources = resources;
                    }

                    console.log('Common Parameters:', commonParameters);
                    console.log('Request Parameters for GetItems:', requestParameters);

                    responseData = await amazonPaapi.GetItems(commonParameters, requestParameters);
                    try {
                        console.log('responseData: ', responseData.body)
                    } catch (error) {
                        console.log(error)
                    }
                } else if (operation === 'searchItems') {
                    // Handling Search Items request
                    const keywords = this.getNodeParameter('keywords', i) as string;
                    requestParameters.Keywords = keywords;

                    // Add Resources parameter if specified
                    const resources = this.getNodeParameter('resources', i, []) as string[];
                    if (resources && resources.length > 0) {
                        requestParameters.Resources = resources;
                    }

                    responseData = await amazonPaapi.SearchItems(commonParameters, requestParameters);
                } else if (operation === 'getBrowseNodes') {
                    // Handling Get Browse Nodes request
                    const browseNodeIds = this.getNodeParameter('browseNodeIds', i) as string | null;

                    if (browseNodeIds) {
                        requestParameters.BrowseNodeIds = browseNodeIds.includes(',') ? browseNodeIds.split(',') : [browseNodeIds];
                    } else {
                        throw new Error('Browse Node IDs are required but were not provided.');
                    }
                    responseData = await amazonPaapi.GetBrowseNodes(commonParameters, requestParameters);
                }

                // Log the API response for debugging
                console.log('API Response:', responseData);

                // Add response to returnData
                returnData.push({ json: responseData });

            } catch (error) {
                // Log error and continue
                console.error('API Request Error:', error);
                if (error instanceof Error) {
                    throw new Error(`Failed to execute Amazon PA API operation: ${error.message}`);
                } else {
                    throw new Error('Failed to execute Amazon PA API operation due to an unknown error.');
                }
            }
        }

        // Return the processed data
        return [returnData];
    }
}
