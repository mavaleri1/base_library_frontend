import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type {
  ApiError,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
  Thread,
  Session,
  SessionFilesResponse,
  UserProfile,
  ProcessingStatus,
  CreateMaterialParams,
  SessionSummary,
  ExportSettings,
  Placeholder,
  UserPlaceholderSettings,
  Profile,
  HITLConfig,
  ProcessingStatusWithHITL,
  SendFeedbackParams,
  Material,
  MaterialsResponse,
  MaterialsFilter,
  SubjectStats,
  LeaderboardEntry,
} from '../types';
import { cleanArtifactMessages } from '../utils/formatters';

/** Map GET /api/process/result response body (200) to ProcessingStatusWithHITL. Handles both success and error payloads. */
function mapProcessResultToStatus(data: Record<string, unknown>): ProcessingStatusWithHITL {
  const threadId = String(data.thread_id ?? '');
  if ('error' in data && data.error != null) {
    return {
      threadId,
      sessionId: '',
      status: 'failed',
      error: String(data.error),
      result: undefined,
      interrupted: false,
      awaiting_feedback: false,
    };
  }
  const sessionId = data.session_id != null ? String(data.session_id) : '';
  const result = data.result;
  const hasInterrupts = Array.isArray(result);
  const cleanedMessages = hasInterrupts ? cleanArtifactMessages(result) : undefined;
  const current_node = data.current_node != null ? String(data.current_node) : undefined;
  return {
    threadId,
    sessionId,
    status: hasInterrupts ? 'processing' : 'completed',
    result,
    interrupted: hasInterrupts,
    interrupt_message: cleanedMessages,
    awaiting_feedback: hasInterrupts,
    current_node,
  };
}

class ApiService {
  private client: AxiosInstance;
  private promptConfigClient: AxiosInstance;
  private tokenProvider: (() => Promise<string | null>) | null = null;

  constructor() {
    // Use environment variables for URL configuration
    // In development: use /api (proxy)
    // In production: use /api (Vercel rewrites)
    let baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
    let promptConfigURL = String(import.meta.env.VITE_PROMPT_CONFIG_API_URL || '/api/v1');

    const isPageHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
    if (isPageHttps) {
      if (baseURL.startsWith('http://')) baseURL = '/api';
      if (promptConfigURL.startsWith('http://')) promptConfigURL = '/api/v1';
    }

    console.log('🔧 API Service initialized with baseURL:', baseURL);
    console.log('🔧 Environment:', import.meta.env.MODE);
    
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.promptConfigClient = axios.create({
      baseURL: promptConfigURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    const requestInterceptor = async (config: any) => {
      if (this.tokenProvider) {
        const token = await this.tokenProvider();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    };

    const responseInterceptor = (response: any) => {
      return response;
    };

    const errorInterceptor = (error: AxiosError) => {
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }

      // Opik: log API errors to backend trace when thread_id is available
      const config = error.config as (typeof error.config) & { opikThreadId?: string };
      if (config?.opikThreadId) {
        this.logClientEvent(config.opikThreadId, 'api_error', {
          message: error.message,
          status: error.response?.status,
        }).catch(() => {});
      }

      const apiError: ApiError = {
        message: error.message || 'An error occurred',
        status: error.response?.status,
        details: error.response?.data,
      };
      return Promise.reject(apiError);
    };

    // Apply interceptors to both clients
    this.client.interceptors.request.use(requestInterceptor, (error) => Promise.reject(error));
    this.client.interceptors.response.use(responseInterceptor, errorInterceptor);
    
    this.promptConfigClient.interceptors.request.use(requestInterceptor, (error) => Promise.reject(error));
    this.promptConfigClient.interceptors.response.use(responseInterceptor, errorInterceptor);
  }

  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with an error
      const message = error.response.data?.message || error.response.data?.detail || 'Server error';
      return new Error(message);
    } else if (error.request) {
      // Request was sent but no response received
      return new Error('No connection to server');
    } else {
      // Something went wrong when setting up the request
      return new Error(error.message || 'Unknown error');
    }
  }

  setTokenProvider(provider: () => Promise<string | null>): void {
    this.tokenProvider = provider;
  }

  clearTokenProvider(): void {
    this.tokenProvider = null;
  }

  /** Log client-side event to Opik via backend (fire-and-forget). */
  async logClientEvent(
    threadId: string | null,
    eventType: string,
    payload: Record<string, unknown> = {}
  ): Promise<void> {
    if (!threadId) return;
    try {
      await this.client.post('/api/opik/client-event', {
        thread_id: threadId,
        event_type: eventType,
        payload,
      });
    } catch {
      // ignore
    }
  }

  // Auth
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', credentials);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<any>('/auth/me');
    const data = response.data;
    return {
      id: data.id,
      name: data.name || data.clerk_user_id || 'User',
      clerkUserId: data.clerk_user_id,
      authMethod: 'clerk' as const,
      createdAt: data.created_at,
    };
  }

  // Materials
  async createMaterial(params: CreateMaterialParams): Promise<ProcessingStatusWithHITL> {
    const formData = new FormData();
    formData.append('question', params.question);
    formData.append('settings', JSON.stringify(params.settings));

    // Add user_id for correct materials handling
    if (params.user_id) {
      formData.append('user_id', params.user_id);
    }

    if (params.images) {
      params.images.forEach((image) => {
        formData.append('images', image);
      });
    }

    const response = await this.client.post<any>('/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
      validateStatus: (s: number) => s === 200 || s === 202,
    });

    if (response.status === 202) {
      const threadId = response.data?.thread_id ?? '';
      return {
        threadId,
        sessionId: '',
        status: 'processing',
        result: undefined,
        interrupted: false,
        awaiting_feedback: false,
        current_node: undefined,
      };
    }

    const hasInterrupts = Array.isArray(response.data.result);
    if (hasInterrupts) {
      console.log('🔍 Raw messages from backend:', response.data.result);
    }
    const cleanedMessages = hasInterrupts ? cleanArtifactMessages(response.data.result) : undefined;
    if (cleanedMessages) {
      console.log('✅ Cleaned messages:', cleanedMessages);
    }

    return {
      threadId: response.data.thread_id,
      sessionId: response.data.session_id,
      status: hasInterrupts ? 'processing' : 'completed',
      result: response.data.result,
      interrupted: hasInterrupts,
      interrupt_message: cleanedMessages,
      awaiting_feedback: hasInterrupts,
      current_node: response.data.current_node,
    };
  }

  async getProcessingStatus(threadId: string): Promise<ProcessingStatus> {
    const response = await this.client.get<ProcessingStatus>(`/state/${threadId}`);
    return response.data;
  }

  // Threads
  async getThreads(): Promise<Thread[]> {
    const response = await this.client.get<{ threads: Thread[] }>('/threads');
    return response.data.threads;
  }

  async getThread(threadId: string): Promise<Thread> {
    const response = await this.client.get<Thread>(`/threads/${threadId}`);
    return response.data;
  }

  async getSessions(threadId: string): Promise<Session[]> {
    const response = await this.client.get<{ sessions: Session[] }>(`/threads/${threadId}/sessions`);
    return response.data.sessions;
  }


  async getSessionFiles(threadId: string, sessionId: string): Promise<SessionFilesResponse> {
    const response = await this.client.get<SessionFilesResponse>(
      `/threads/${threadId}/sessions/${sessionId}`
    );
    const files = (response.data.files || []).filter(file => file && file.path);
    return { files, metadata: response.data.metadata };
  }

  async getFileContent(threadId: string, sessionId: string, filePath: string): Promise<string> {
    const response = await this.client.get<string>(
      `/threads/${threadId}/sessions/${sessionId}/files/${encodeURIComponent(filePath)}`,
      {
        headers: {
          Accept: 'text/plain',
        },
      }
    );
    return response.data;
  }

  // Profile (deprecated - kept for backwards compatibility)
  async getUserProfile(): Promise<UserProfile> {
    const response = await this.client.get<UserProfile>('/profile');
    return response.data;
  }

  async updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const response = await this.client.put<UserProfile>('/profile', profile);
    return response.data;
  }

  async updatePreferences(preferences: Partial<UserProfile['preferences']>): Promise<UserProfile> {
    const response = await this.client.put<UserProfile>('/profile/preferences', preferences);
    return response.data;
  }

  // Placeholders & Profiles (Prompt Config Service)
  async getAllPlaceholders(): Promise<Placeholder[]> {
    const response = await this.promptConfigClient.get<Placeholder[]>('/placeholders/');
    return response.data;
  }

  /**
   * Initialize user in prompt-config-service
   * This is critical for creating a record in user_profiles
   * Use endpoint to get user placeholders,
   * which will automatically create user if it doesn't exist
   */
  async initializePromptConfigUser(): Promise<any> {
    try {
      // Get current user information from token
      const currentUser = await this.getCurrentUser();
      const userId = currentUser.id;
      
      // Use real endpoint to get user placeholders
      // This will automatically create user in prompt-config-service if it doesn't exist
      const response = await this.promptConfigClient.get(`/users/${userId}/placeholders`);
      return response.data;
    } catch (error: any) {
      // Don't interrupt authentication if prompt-config-service is unavailable
      // User can still log in to the system
      return null;
    }
  }

  async getUserPlaceholders(userId: string): Promise<UserPlaceholderSettings> {
    try {
    const response = await this.promptConfigClient.get<UserPlaceholderSettings>(
      `/users/${userId}/placeholders`
    );
      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting user placeholders:', error);
      // Return empty settings if user doesn't exist or service is unavailable
      if (error.status === 404 || error.status === 500) {
        console.log('🔄 Returning empty placeholder settings...');
        return {
          placeholders: {},
          active_profile_id: null,
          active_profile_name: null
        };
      }
      throw error;
    }
  }

  async updateUserPlaceholder(
    userId: string,
    placeholderId: string,
    valueId: string
  ): Promise<void> {
    await this.promptConfigClient.put(
      `/users/${userId}/placeholders/${placeholderId}`,
      { value_id: valueId }
    );
  }

  async applyProfile(userId: string, profileId: string): Promise<UserPlaceholderSettings> {
    const response = await this.promptConfigClient.post<UserPlaceholderSettings>(
      `/users/${userId}/apply-profile/${profileId}`
    );
    return response.data;
  }

  async resetUserSettings(userId: string): Promise<UserPlaceholderSettings> {
    const response = await this.promptConfigClient.post<UserPlaceholderSettings>(
      `/users/${userId}/reset`
    );
    return response.data;
  }

  async getProfiles(category?: string): Promise<Profile[]> {
    const response = await this.promptConfigClient.get<Profile[]>('/profiles/', {
      params: category ? { category } : undefined,
    });
    return response.data;
  }

  async getProfile(profileId: string): Promise<Profile> {
    const response = await this.promptConfigClient.get<Profile>(`/profiles/${profileId}`);
    return response.data;
  }

  // User Sessions
  async getRecentSessions(userId: string, limit: number = 5): Promise<SessionSummary[]> {
    const response = await this.client.get<SessionSummary[]>(`/users/${userId}/sessions/recent`, {
      params: { limit }
    });
    return response.data;
  }

  async getExportSettings(userId: string): Promise<ExportSettings> {
    const response = await this.client.get<ExportSettings>(`/users/${userId}/export-settings`);
    return response.data;
  }

  async updateExportSettings(userId: string, settings: Partial<ExportSettings>): Promise<ExportSettings> {
    const response = await this.client.put<ExportSettings>(`/users/${userId}/export-settings`, settings);
    return response.data;
  }

  // Export
  async exportSingleDocument(
    threadId: string,
    sessionId: string,
    documentName: string,
    format: 'markdown' | 'pdf' = 'markdown'
  ): Promise<Blob> {
    const response = await this.client.get(
      `/threads/${threadId}/sessions/${sessionId}/export/single`,
      {
        params: {
          document_name: documentName,
          format,
        },
        responseType: 'blob',
        timeout: 180000,
      }
    );
    return response.data;
  }

  async exportPackage(
    threadId: string,
    sessionId: string,
    packageType: 'final' | 'all' = 'final',
    format: 'markdown' | 'pdf' = 'markdown'
  ): Promise<Blob> {
    const response = await this.client.get(
      `/threads/${threadId}/sessions/${sessionId}/export/package`,
      {
        params: {
          package_type: packageType,
          format,
        },
        responseType: 'blob',
        timeout: 300000,
      }
    );
    return response.data;
  }

  // HITL Methods
  async getHITLConfig(threadId: string): Promise<HITLConfig> {
    const response = await this.client.get<HITLConfig>(`/hitl/${threadId}`);
    return response.data;
  }

  async updateHITLNode(
    threadId: string,
    nodeName: string,
    enabled: boolean
  ): Promise<HITLConfig> {
    const response = await this.client.patch<HITLConfig>(
      `/hitl/${threadId}/node/${nodeName}`,
      { enabled }
    );
    return response.data;
  }

  async bulkUpdateHITL(threadId: string, enableAll: boolean): Promise<HITLConfig> {
    const response = await this.client.post<HITLConfig>(
      `/hitl/${threadId}/bulk`,
      { enable_all: enableAll }
    );
    return response.data;
  }

  async sendFeedback(params: SendFeedbackParams): Promise<ProcessingStatusWithHITL> {
    console.log('🔄 Sending HITL feedback:', {
      thread_id: params.thread_id,
      message: params.message,
      question: params.question,
      user_id: params.user_id,
      images_count: params.images?.length || 0
    });

    const formData = new FormData();
    formData.append('thread_id', params.thread_id);
    formData.append('message', params.message);
    formData.append('question', params.question);
    
    // Add user_id for correct materials handling
    if (params.user_id) {
      formData.append('user_id', params.user_id);
    }

    // Add images if they exist
    if (params.images && params.images.length > 0) {
      params.images.forEach((image) => {
        formData.append('images', image);
      });
    }

    const response = await this.client.post<any>('/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
      validateStatus: (s: number) => s === 200 || s === 202,
      opikThreadId: params.thread_id,
    } as any);

    console.log('✅ HITL feedback response:', response.data);

    if (response.status === 202) {
      const threadId = response.data?.thread_id ?? params.thread_id;
      return {
        threadId,
        sessionId: '',
        status: 'processing',
        result: undefined,
        interrupted: false,
        awaiting_feedback: false,
        current_node: undefined,
      };
    }

    const hasInterrupts = Array.isArray(response.data.result);
    const cleanedMessages = hasInterrupts ? cleanArtifactMessages(response.data.result) : undefined;
    return {
      threadId: response.data.thread_id,
      sessionId: response.data.session_id,
      status: hasInterrupts ? 'processing' : 'completed',
      result: response.data.result,
      interrupted: hasInterrupts,
      interrupt_message: cleanedMessages,
      awaiting_feedback: hasInterrupts,
      current_node: response.data.current_node,
    };
  }

  /**
   * Poll result after POST /api/process (202). Returns 202 + { status: 'pending' } or 200 + result/error.
   */
  async getProcessResult(threadId: string): Promise<{ status: number; data: Record<string, unknown> }> {
    const response = await this.client.get<Record<string, unknown>>(`/process/result/${threadId}`, {
      timeout: 30000,
      validateStatus: (s: number) => s === 200 || s === 202,
    });
    return { status: response.status, data: response.data ?? {} };
  }

  /** Map getProcessResult 200 body to ProcessingStatusWithHITL. */
  mapProcessResultToStatus(data: Record<string, unknown>): ProcessingStatusWithHITL {
    return mapProcessResultToStatus(data);
  }

  async getThreadState(threadId: string): Promise<ProcessingStatusWithHITL> {
    const response = await this.client.get<any>(`/state/${threadId}`);
    
    // Parse state for interrupts
    const hasInterrupts = response.data.interrupts && response.data.interrupts.length > 0;
    const rawMessages = hasInterrupts 
      ? response.data.interrupts[0]?.value?.message || []
      : undefined;
    const cleanedMessages = rawMessages ? cleanArtifactMessages(rawMessages) : undefined;

    return {
      threadId: response.data.thread_id || threadId,
      sessionId: response.data.session_id,
      status: hasInterrupts ? 'processing' : (response.data.status || 'completed'),
      result: response.data.result,
      interrupted: hasInterrupts,
      interrupt_message: cleanedMessages,
      awaiting_feedback: hasInterrupts,
      current_node: response.data.current_node,
    };
  }

  // Materials API (temporary methods, backend needs to be refined)
  async getAllMaterials(filters?: MaterialsFilter): Promise<MaterialsResponse> {
    console.log('🔍 Getting all materials with filters:', filters);
    console.log('🔑 Token provider:', this.tokenProvider ? 'set' : 'missing');
    console.log('🌐 Base URL:', this.client.defaults.baseURL);
    console.log('📡 Full URL will be:', `${this.client.defaults.baseURL}/materials/all`);
    
    const response = await this.client.get<MaterialsResponse>(
      '/materials/all',
      {
        params: {
          page: filters?.page,
          page_size: filters?.page_size,
          subject: filters?.subject,
          grade: filters?.grade,
          status: filters?.status,
        }
      }
    );
    
    console.log('📦 All materials response:', response.data);
    return response.data;
  }

  async getMyMaterials(filters?: MaterialsFilter): Promise<MaterialsResponse> {
    console.log('🔍 Getting my materials with filters:', filters);
    console.log('🔑 Token provider:', this.tokenProvider ? 'set' : 'missing');
    console.log('🌐 Base URL:', this.client.defaults.baseURL);
    console.log('📡 Full URL will be:', `${this.client.defaults.baseURL}/materials/my`);
    
    try {
      const response = await this.client.get<MaterialsResponse>(
        '/materials/my',
        {
          params: {
            page: filters?.page,
            page_size: filters?.page_size,
            subject: filters?.subject,
            grade: filters?.grade,
            status: filters?.status,
          }
        }
      );
      
      console.log('📦 My materials response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting my materials:', error);
      // Fallback to getAllMaterials if my materials endpoint is not available
      if (error.status === 404) {
        console.log('🔄 Falling back to getAllMaterials...');
        return await this.getAllMaterials(filters);
      }
      throw error;
    }
  }

  async getMaterial(materialId: string, includeContent: boolean = true): Promise<Material> {
    const response = await this.client.get<Material>(
      `/materials/${materialId}`,
      {
        params: {
          include_content: includeContent
        }
      }
    );
    return response.data;
  }

  async getSubjectStats(): Promise<SubjectStats[]> {
    const response = await this.client.get<{ subjects: SubjectStats[] }>(
      '/materials/stats/subjects'
    );
    return response.data.subjects;
  }

  async updateMaterial(materialId: string, updates: Partial<Material>): Promise<Material> {
    const response = await this.client.patch<Material>(
      `/materials/${materialId}`,
      updates
    );
    return response.data;
  }

  async deleteMaterial(materialId: string): Promise<void> {
    await this.client.delete(`/materials/${materialId}`);
  }

  /**
   * Get user leaderboard
   */
  async getLeaderboard(page: number = 1, pageSize: number = 50): Promise<{
    entries: LeaderboardEntry[];
    total: number;
    page: number;
    page_size: number;
  }> {
    try {
      const response = await this.client.get('/materials/leaderboard', {
        params: {
          page,
          page_size: pageSize
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get current user statistics
   */
  async getMyStats(): Promise<{
    totalMaterials: number;
    publishedMaterials: number;
    draftMaterials: number;
    subjects: Array<{ subject: string; count: number }>;
  }> {
    try {
      const response = await this.client.get('/user/my-stats');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

// Create API service instance with proper configuration
export const api = new ApiService();
