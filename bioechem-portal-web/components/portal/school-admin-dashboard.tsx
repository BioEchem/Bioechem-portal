import { PortalCard } from "@/components/portal/portal-page";
import {
  DashboardProfileCard,
  DashboardTable,
  DashboardWelcomeCard,
  StatCard,
} from "@/components/portal/dashboard-ui";
import type { SchoolAdminDashboardData } from "@/lib/dashboard/school-admin-data";

type SchoolAdminDashboardProps = {
  data: SchoolAdminDashboardData;
  asUserId?: string;
};

export function SchoolAdminDashboard({ data, asUserId }: SchoolAdminDashboardProps) {
  return (
    <div className="space-y-4">
      <DashboardWelcomeCard
        name={data.adminName}
        subtitle={`School admin dashboard for ${data.schoolName}.`}
      />

      <DashboardProfileCard
        fields={[
          { label: "Name", value: data.adminName },
          { label: "Email", value: data.adminEmail },
          { label: "Role", value: "School admin" },
          { label: "School", value: data.schoolName },
        ]}
        hideEditLink={!!asUserId}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active cohorts" value={data.stats.activeCohorts} />
        <StatCard label="Students enrolled" value={data.stats.totalEnrolled} />
        <StatCard label="Teachers" value={data.stats.totalTeachers} />
        <StatCard label="Running cohorts" value={data.cohorts.length} />
      </div>

      <PortalCard>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
          Cohorts at your school
        </h2>
        <div className="mt-4">
          <DashboardTable
            headers={["Cohort", "Enrolled", "Status"]}
            rows={data.cohorts.map((cohort) => [
              cohort.name,
              String(cohort.enrolledCount),
              cohort.isActive ? "Active" : "Inactive",
            ])}
            emptyMessage="No cohorts are set up for your school yet."
          />
        </div>
      </PortalCard>

      <PortalCard>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
          Students
        </h2>
        <div className="mt-4">
          <DashboardTable
            headers={["Name", "Email", "Class", "Age"]}
            rows={data.students.map((student) => [
              student.fullName,
              student.email ?? "—",
              student.cohortName ?? "—",
              student.age != null ? String(student.age) : "—",
            ])}
            emptyMessage="No approved students at your school yet."
          />
        </div>
      </PortalCard>

      <PortalCard>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
          Teachers
        </h2>
        <div className="mt-4">
          <DashboardTable
            headers={["Name", "Email"]}
            rows={data.teachers.map((teacher) => [
              teacher.fullName,
              teacher.email ?? "—",
            ])}
            emptyMessage="No approved teachers at your school yet."
          />
        </div>
      </PortalCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <PortalCard>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
            Grades &amp; averages
          </h2>
          <div className="mt-4">
            <DashboardTable
              headers={["Cohort", "Graded", "Average"]}
              rows={data.gradeAverages.map((row) => [
                row.cohortName,
                String(row.gradedCount),
                row.averagePercent != null ? `${row.averagePercent}%` : "—",
              ])}
              emptyMessage="No grades have been recorded for your school's cohorts yet."
            />
          </div>
        </PortalCard>

        <PortalCard>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
            Curriculum overview
          </h2>
          <div className="mt-4">
            <DashboardTable
              headers={["Cohort", "Published modules"]}
              rows={data.curriculum.map((entry) => [entry.cohortName, String(entry.moduleCount)])}
              emptyMessage="No published modules yet for your school's cohorts."
            />
          </div>
        </PortalCard>
      </div>
    </div>
  );
}
