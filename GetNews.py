import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('NewsArticles')

def lambda_handler(event, context):
    response = table.scan()
    items = response['Items']
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(items)
    }
