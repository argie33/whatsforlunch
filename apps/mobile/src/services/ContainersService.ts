import { Container, Item } from '@/db/models';
import { useDatabase } from '@/db';

export class ContainersService {
  private db: typeof useDatabase;

  constructor() {
    // Lazy-load database context
  }

  async getHouseholdContainers(householdId: string): Promise<Container[]> {
    // Placeholder: will query WatermelonDB
    return [];
  }

  async getContainerByQrToken(token: string): Promise<Container | null> {
    // Placeholder: will query WatermelonDB
    return null;
  }

  async createContainer(
    householdId: string,
    nickname?: string,
    imageUrl?: string
  ): Promise<Container> {
    // Placeholder: will create via AppSync mutation
    throw new Error('Not implemented in Phase A');
  }

  async updateContainer(
    containerId: string,
    updates: Partial<Container>
  ): Promise<void> {
    // Placeholder: will update via AppSync mutation
  }

  async archiveContainer(containerId: string): Promise<void> {
    // Placeholder: will archive via AppSync mutation
  }

  async getContainerItems(containerId: string): Promise<Item[]> {
    // Placeholder: will query related items
    return [];
  }
}

export const containersService = new ContainersService();
