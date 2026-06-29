import { getDatabase, migrate } from '$lib/server/db';

migrate(getDatabase());
