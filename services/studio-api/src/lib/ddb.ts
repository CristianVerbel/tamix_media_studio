import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';

/**
 * Acceso a la tabla propia del Studio.
 *
 * Mismo estilo que `services/social-api/src/lib/ddb.ts` en Tamix-social-media
 * a propósito — mismo nombre de funciones, mismo cliente reutilizado entre
 * invocaciones —, pero es **otra tabla, en otra cuenta de despliegue de
 * SST, en este repositorio**. Nada de lo que vive aquí es la red social: es
 * sólo lo que el Studio necesita y que la red no tiene (colas de
 * programación, integraciones, auditoría propia). El contenido, los
 * permisos y los ingresos de verdad se leen siempre de Tamix, nunca de esta
 * tabla.
 */

export const TABLE = process.env.TABLE_NAME ?? 'tamix-media-studio-dev';

const client = new DynamoDBClient({});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true, convertClassInstanceToMap: true },
});

export type Key = { PK: string; SK: string };

export async function getItem<T>(key: Key, opciones?: { consistente?: boolean }): Promise<T | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: key, ConsistentRead: opciones?.consistente })
  );
  return (res.Item as T) ?? null;
}

export async function putItem(item: Record<string, unknown>, options?: { ifNotExists?: boolean }) {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ...(options?.ifNotExists
        ? { ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)' }
        : {}),
    })
  );
}

export async function deleteItem(key: Key) {
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: key }));
}

export type QueryOptions = {
  index?: string;
  skPrefix?: string;
  limit?: number;
  cursor?: string | null;
  ascending?: boolean;
};

export type Page<T> = { items: T[]; nextCursor: string | null };

export async function query<T>(pk: string, options: QueryOptions = {}): Promise<Page<T>> {
  const pkName = options.index ? `${options.index}PK` : 'PK';
  const skName = options.index ? `${options.index}SK` : 'SK';

  const input: QueryCommandInput = {
    TableName: TABLE,
    IndexName: options.index,
    KeyConditionExpression: options.skPrefix
      ? '#pk = :pk AND begins_with(#sk, :skPrefix)'
      : '#pk = :pk',
    ExpressionAttributeNames: {
      '#pk': pkName,
      ...(options.skPrefix ? { '#sk': skName } : {}),
    },
    ExpressionAttributeValues: {
      ':pk': pk,
      ...(options.skPrefix ? { ':skPrefix': options.skPrefix } : {}),
    },
    Limit: options.limit ?? 25,
    ScanIndexForward: options.ascending ?? true,
    ...(options.cursor ? { ExclusiveStartKey: decodeCursor(options.cursor) } : {}),
  };

  const res = await ddb.send(new QueryCommand(input));
  return {
    items: (res.Items ?? []) as T[],
    nextCursor: res.LastEvaluatedKey ? encodeCursor(res.LastEvaluatedKey) : null,
  };
}

export async function queryAll<T>(pk: string, options: QueryOptions = {}): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null = options.cursor ?? null;
  do {
    const page: Page<T> = await query<T>(pk, { ...options, cursor, limit: options.limit ?? 200 });
    out.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return out;
}

export async function updateItem(
  key: Key,
  updates: Record<string, unknown>,
  options?: { borrar?: string[] }
) {
  const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
  const borrar = options?.borrar ?? [];
  if (entries.length === 0 && borrar.length === 0) return;

  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const sets = entries.map(([field, value], i) => {
    names[`#f${i}`] = field;
    values[`:v${i}`] = value;
    return `#f${i} = :v${i}`;
  });
  const removes = borrar.map((field, i) => {
    names[`#r${i}`] = field;
    return `#r${i}`;
  });

  const expresion = [
    sets.length ? `SET ${sets.join(', ')}` : '',
    removes.length ? `REMOVE ${removes.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: key,
      UpdateExpression: expresion,
      ExpressionAttributeNames: names,
      ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
    })
  );
}

function encodeCursor(key: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(key), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Cursor inválido');
  }
}
