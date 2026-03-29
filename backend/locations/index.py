import json
import os
import psycopg2

def handler(event: dict, context) -> dict:
    """Сохранение и получение истории геолокаций из базы данных."""

    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    method = event.get('httpMethod', 'GET')

    try:
        if method == 'GET':
            cur.execute(
                "SELECT id, lat, lng, accuracy, altitude, recorded_at FROM locations ORDER BY recorded_at DESC LIMIT 50"
            )
            rows = cur.fetchall()
            records = [
                {
                    'id': str(row[0]),
                    'lat': row[1],
                    'lng': row[2],
                    'accuracy': row[3],
                    'altitude': row[4],
                    'timestamp': row[5].isoformat(),
                }
                for row in rows
            ]
            return {
                'statusCode': 200,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'locations': records}),
            }

        elif method == 'POST':
            body = json.loads(event.get('body') or '{}')
            lat = body['lat']
            lng = body['lng']
            accuracy = body['accuracy']
            altitude = body.get('altitude')

            cur.execute(
                "INSERT INTO locations (lat, lng, accuracy, altitude) VALUES (%s, %s, %s, %s) RETURNING id, recorded_at",
                (lat, lng, accuracy, altitude),
            )
            row = cur.fetchone()
            conn.commit()
            return {
                'statusCode': 200,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'id': str(row[0]), 'timestamp': row[1].isoformat()}),
            }

        elif method == 'DELETE':
            cur.execute("DELETE FROM locations")
            conn.commit()
            return {
                'statusCode': 200,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'ok': True}),
            }

        else:
            return {'statusCode': 405, 'headers': cors_headers, 'body': 'Method Not Allowed'}

    finally:
        cur.close()
        conn.close()
