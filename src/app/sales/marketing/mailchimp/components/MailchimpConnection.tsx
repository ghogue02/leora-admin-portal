'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface MailchimpConnectionProps {
  onConnect: () => void;
}

export function MailchimpConnection({ onConnect }: MailchimpConnectionProps) {
  const [connectionMethod, setConnectionMethod] = useState<'oauth' | 'apikey'>('oauth');
  const [apiKey, setApiKey] = useState('');
  const [selectedList, setSelectedList] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    lists?: { id: string; name: string }[];
  } | null>(null);

  const handleOAuthConnect = () => {
    setIsConnecting(true);
    // Redirect to Mailchimp OAuth flow
    const clientId = process.env.NEXT_PUBLIC_MAILCHIMP_CLIENT_ID;
    const redirectUri = encodeURIComponent(
      `${window.location.origin}/api/mailchimp/callback`
    );
    window.location.href = `https://login.mailchimp.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
  };

  const handleApiKeyTest = async () => {
    if (!apiKey) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/mailchimp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();
      setTestResult(data);

      if (data.success && data.lists) {
        // Auto-select first list if only one available
        if (data.lists.length === 1) {
          setSelectedList(data.lists[0].id);
        }
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to connect. Please check your API key and try again.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleApiKeyConnect = async () => {
    if (!apiKey || !selectedList) return;

    setIsConnecting(true);

    try {
      const response = await fetch('/api/mailchimp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, defaultListId: selectedList }),
      });

      if (response.ok) {
        onConnect();
      } else {
        const error = await response.json();
        setTestResult({
          success: false,
          message: error.message || 'Failed to save connection',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'An error occurred. Please try again.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Tabs value={connectionMethod} onValueChange={(v: any) => setConnectionMethod(v)}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="oauth">OAuth (Recommended)</TabsTrigger>
        <TabsTrigger value="apikey">API Key</TabsTrigger>
      </TabsList>

      <TabsContent value="oauth" className="space-y-4">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect your Mailchimp account securely using OAuth. This is the recommended method.
          </p>

          <Alert>
            <AlertDescription>
              You'll be redirected to Mailchimp to authorize this application. After authorization,
              you'll be redirected back to complete the setup.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleOAuthConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect with Mailchimp
              </>
            )}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="apikey" className="space-y-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="api-key">Mailchimp API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Mailchimp API key"
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Find your API key in your{' '}
              <a
                href="https://admin.mailchimp.com/account/api/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Mailchimp Account Settings
              </a>
            </p>
          </div>

          <Button
            onClick={handleApiKeyTest}
            disabled={!apiKey || isTesting}
            variant="outline"
            className="w-full"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing Connection...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}

          {testResult?.success && testResult.lists && testResult.lists.length > 0 && (
            <div>
              <Label htmlFor="default-list">Default Audience List</Label>
              <Select value={selectedList} onValueChange={setSelectedList}>
                <SelectTrigger id="default-list">
                  <SelectValue placeholder="Select a list" />
                </SelectTrigger>
                <SelectContent>
                  {testResult.lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                Choose which Mailchimp list to sync your customers to
              </p>
            </div>
          )}

          {testResult?.success && selectedList && (
            <Button
              onClick={handleApiKeyConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Complete Connection'
              )}
            </Button>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
