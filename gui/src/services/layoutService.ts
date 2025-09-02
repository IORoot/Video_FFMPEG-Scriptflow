export interface SavedLayout {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface LayoutData {
  name: string;
  layout: any;
  createdAt: string;
  updatedAt: string;
}

class LayoutService {
  private baseUrl = 'http://localhost:3002/api';

  async getLayouts(): Promise<SavedLayout[]> {
    const response = await fetch(`${this.baseUrl}/layouts`, {
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error('Failed to load layouts');
    }

    return response.json();
  }

  async saveLayout(name: string, layout: any): Promise<LayoutData> {
    const response = await fetch(`${this.baseUrl}/layouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ name, layout })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error('Failed to save layout');
    }

    return response.json();
  }

  async loadLayout(id: string): Promise<LayoutData> {
    const response = await fetch(`${this.baseUrl}/layouts/${id}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      if (response.status === 404) {
        throw new Error('Layout not found');
      }
      throw new Error('Failed to load layout');
    }

    return response.json();
  }

  async deleteLayout(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/layouts/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      if (response.status === 404) {
        throw new Error('Layout not found');
      }
      throw new Error('Failed to delete layout');
    }
  }
}

export const layoutService = new LayoutService();
