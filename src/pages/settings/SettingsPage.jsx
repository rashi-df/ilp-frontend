import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Settings, CreditCard, Mail, Save } from 'lucide-react';
import { getSettings, updateSettings } from '../../api/settings';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';

const providerOptions = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'manual', label: 'Manual Bank Transfer' },
];

const currencyOptions = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'SAR', label: 'SAR' },
  { value: 'AED', label: 'AED' },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const { register, handleSubmit, reset } = useForm();

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      reset({
        appName: settings.app?.name || '',
        supportEmail: settings.app?.supportEmail || '',
        contactPhone: settings.app?.contactPhone || '',
        website: settings.app?.website || '',
        provider: settings.payment?.provider || 'manual',
        apiKey: settings.payment?.apiKey || '',
        secretKey: settings.payment?.secretKey || '',
        currency: settings.payment?.currency || 'USD',
        smtpHost: settings.email?.smtpHost || '',
        smtpPort: settings.email?.smtpPort || 587,
        smtpUsername: settings.email?.smtpUsername || '',
        smtpPassword: settings.email?.smtpPassword || '',
      });
    }
  }, [settings, reset]);

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      toast.success('Settings saved');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    },
  });

  const onSubmit = (values) => {
    save({
      app: {
        name: values.appName,
        supportEmail: values.supportEmail,
        contactPhone: values.contactPhone,
        website: values.website,
      },
      payment: {
        provider: values.provider,
        apiKey: values.apiKey,
        secretKey: values.secretKey,
        currency: values.currency,
      },
      email: {
        smtpHost: values.smtpHost,
        smtpPort: Number(values.smtpPort),
        smtpUsername: values.smtpUsername,
        smtpPassword: values.smtpPassword,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
      <p className="text-text-secondary mt-1">
        Configure platform preferences and options
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
        {/* App Settings */}
        <div className="bg-white rounded-xl border border-surface-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">
              App Settings
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="App Name"
              placeholder="Islamic Learning Platform"
              {...register('appName')}
            />
            <Input
              label="Support Email"
              type="email"
              placeholder="support@example.com"
              {...register('supportEmail')}
            />
            <Input
              label="Contact Phone"
              placeholder="+1 234 567 8900"
              {...register('contactPhone')}
            />
            <Input
              label="Website"
              type="url"
              placeholder="https://example.com"
              {...register('website')}
            />
          </div>
        </div>

        {/* Payment Gateway */}
        <div className="bg-white rounded-xl border border-surface-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">
              Payment Gateway
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Provider"
              options={providerOptions}
              {...register('provider')}
            />
            <Input
              label="API Key"
              placeholder="pk_live_..."
              {...register('apiKey')}
            />
            <Input
              label="Secret Key"
              type="password"
              placeholder="Enter new secret key"
              {...register('secretKey')}
            />
            <Select
              label="Currency"
              options={currencyOptions}
              {...register('currency')}
            />
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-white rounded-xl border border-surface-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">
              Email Settings
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SMTP Host"
              placeholder="smtp.gmail.com"
              {...register('smtpHost')}
            />
            <Input
              label="SMTP Port"
              type="number"
              placeholder="587"
              {...register('smtpPort')}
            />
            <Input
              label="SMTP Username"
              placeholder="user@gmail.com"
              {...register('smtpUsername')}
            />
            <Input
              label="SMTP Password"
              type="password"
              placeholder="Enter new SMTP password"
              {...register('smtpPassword')}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" loading={isSaving} size="lg">
            <Save className="w-4 h-4" />
            Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
