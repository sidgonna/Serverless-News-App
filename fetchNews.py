import feedparser
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('NewsArticles')

RSS_FEEDS = [
    'http://rss.cnn.com/rss/cnn_topstories.rss',
    'https://www.bbc.com/news/rss.xml'
]

def lambda_handler(event, context):
    for feed_url in RSS_FEEDS:
        feed = feedparser.parse(feed_url)
        for entry in feed.entries:
            try:
                pub_date = getattr(entry, 'published', None) or \
                          getattr(entry, 'pubDate', None) or \
                          getattr(entry, 'updated', None) or \
                          'Unknown'
                article = {
                    'articleId': entry.link,  # Use articleId instead of ArticleLink
                    'Title': getattr(entry, 'title', 'Untitled'),
                    'Description': getattr(entry, 'description', ''),
                    'PubDate': pub_date,
                    'Source': getattr(feed.feed, 'title', 'Unknown')
                }
                table.put_item(Item=article, ConditionExpression='attribute_not_exists(articleId)')
            except (table.meta.client.exceptions.ConditionalCheckFailedException, AttributeError) as e:
                print(f"Skipping entry: {str(e)}")
                continue
    return {'statusCode': 200, 'body': 'News fetched'}
