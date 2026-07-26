import React from 'react';

interface DashboardHomeProps {
  user: any;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ user }) => {
  return (
    <section id="dashboard-top">
      <h1 className="text-3xl font-bold mb-2 text-text-primary">
        Hello, {(user?.name || 'User').split(' ')[0]}!
      </h1>
      <p className="text-text-muted">Ready to crush your goals today?</p>
    </section>
  );
};
