import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PersonalActionPlan } from "@/components/personal-action-plan";
import {
  getDefaultPersonalProfile,
  mapPersonalProfile,
  PersonalProfileRow
} from "@/lib/money99-classic";
import { getWorkspaceContext } from "@/lib/workspace-context";
import {
  resetPersonalProfile,
  savePersonalProfile,
  skipPersonalProfileOnboarding
} from "@/app/personal-profile/actions";
import { SpouseQuestionGuard } from "@/app/personal-profile/spouse-question-guard";

export default async function PersonalProfilePage({
  searchParams
}: {
  searchParams: Promise<{
    error?: string;
    next?: string;
    onboarding?: string;
    success?: string;
  }>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const { error, next, onboarding, success } = await searchParams;
  const isOnboarding = onboarding === "1";
  const nextPath = normalizeNextPath(next);
  const { data, error: loadError } = await supabase
    .from("personal_profiles")
    .select(
      "workspace_id,planning_horizon,marital_status,housing_status,birth_year,dependents,monthly_income,monthly_fixed_costs,emergency_reserve_target,retirement_goal,risk_tolerance,notes,classic_answers"
    )
    .eq("workspace_id", workspaceId)
    .maybeSingle<PersonalProfileRow>();

  const profile = data ? mapPersonalProfile(data) : getDefaultPersonalProfile(workspaceId);
  const answers = profile.classicAnswers;
  const questionProgress = getQuestionProgress(answers);
  const answeredCount = questionProgress.filter(Boolean).length;

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page">
        <div className="module-hero panel">
          <div>
            <p className="section-label">Guia de adaptação</p>
            <h2>Perfil pessoal</h2>
            <p className="supporting-copy">
              Um questionário guiado para ajustar o Deniaros ao seu momento de
              vida financeira. Você pode revisar e atualizar quando quiser.
            </p>
          </div>
          <div className="profile-badges">
            <span className="status-chip">{answeredCount} de 18 respondidas</span>
            <span className="status-chip">Editável a qualquer momento</span>
          </div>
        </div>

        {loadError ? (
          <p className="form-error">
            Execute `supabase/migrations/0007_personal_profile_classic_questionnaire.sql` para ativar o
            questionário Money99.
          </p>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        {isOnboarding ? (
          <section className="panel">
            <p className="supporting-copy">
              Recomendamos preencher agora para personalizar o sistema. Se preferir, você pode pular e
              responder depois.
            </p>
            <div className="form-actions planner-side-actions">
              <form action={skipPersonalProfileOnboarding}>
                {nextPath ? <input name="nextPath" type="hidden" value={nextPath} /> : null}
                <button className="ghost-button" type="submit">
                  Pular por enquanto
                </button>
              </form>
            </div>
          </section>
        ) : null}

        <PersonalActionPlan
          answeredCount={answeredCount}
          profile={profile}
          totalQuestions={questionProgress.length}
        />

        <section className="classic-profile-shell">
          <aside className="classic-profile-rail">
            <h3>Guia pessoal</h3>
            <p>
              Responda no seu ritmo. Quanto mais completo, mais precisas ficam
              as recomendações de planejamento, previsão e metas.
            </p>
          </aside>

          <section className="classic-profile-content">
            <header className="classic-profile-header">
              <h3>Perguntas-chave</h3>
              <div className="classic-question-progress">
                <p className="micro-copy">
                  {answeredCount} de 18 concluída(s)
                </p>
                <div className="classic-question-progress-grid">
                  {questionProgress.map((done, index) => (
                    <a
                      className={`classic-question-progress-item${done ? " done" : ""}`}
                      href={`#q-${index + 1}`}
                      key={`progress-${index + 1}`}
                      title={`Ir para pergunta ${index + 1}`}
                    >
                      {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            </header>

            <form action={savePersonalProfile} className="classic-profile-form">
              {nextPath ? <input name="nextPath" type="hidden" value={nextPath} /> : null}

              <QuestionCard index={1} title="Qual e o seu nome?">
                <input defaultValue={answers.firstName} name="firstName" />
              </QuestionCard>

              <QuestionCard index={2} title="Qual e o seu sobrenome?">
                <input defaultValue={answers.lastName} name="lastName" />
              </QuestionCard>

              <QuestionCard index={3} title="Quando você nasceu?">
                <input defaultValue={answers.birthDate} name="birthDate" type="date" />
              </QuestionCard>

              <QuestionCard index={4} title="De quem sao as financas que você desejá monitorar?">
                <label className="classic-radio-option">
                  <input
                    defaultChecked={answers.financesScope === "self"}
                    name="financesScope"
                    type="radio"
                    value="self"
                  />
                  Minhas
                </label>
                <label className="classic-radio-option">
                  <input
                    defaultChecked={answers.financesScope === "self_and_spouse"}
                    name="financesScope"
                    type="radio"
                    value="self_and_spouse"
                  />
                  Minhas e do meu conjuge
                </label>
              </QuestionCard>

              <QuestionCard
                disabled={answers.financesScope === "self"}
                index={5}
                isSpouseQuestion
                title="Qual e o nome do seu conjuge?"
              >
                <input
                  defaultValue={answers.spouseFirstName}
                  disabled={answers.financesScope === "self"}
                  name="spouseFirstName"
                />
              </QuestionCard>

              <QuestionCard
                disabled={answers.financesScope === "self"}
                index={6}
                isSpouseQuestion
                title="Qual e o sobrenome do seu conjuge?"
              >
                <input
                  defaultValue={answers.spouseLastName}
                  disabled={answers.financesScope === "self"}
                  name="spouseLastName"
                />
              </QuestionCard>

              <QuestionCard
                disabled={answers.financesScope === "self"}
                index={7}
                isSpouseQuestion
                title="Quando seu conjuge nasceu?"
              >
                <input
                  defaultValue={answers.spouseBirthDate}
                  disabled={answers.financesScope === "self"}
                  name="spouseBirthDate"
                  type="date"
                />
              </QuestionCard>

              <QuestionCard index={8} title="Qual e o seu estado civil?">
                <label className="classic-radio-option">
                  <input
                    defaultChecked={answers.maritalStatus === "married"}
                    name="maritalStatus"
                    type="radio"
                    value="married"
                  />
                  Casado
                </label>
                <label className="classic-radio-option">
                  <input
                    defaultChecked={answers.maritalStatus === "not_married"}
                    name="maritalStatus"
                    type="radio"
                    value="not_married"
                  />
                  Não casado
                </label>
              </QuestionCard>

              <QuestionCard index={9} title="Casa própria (marque tudo o que se aplicar):">
                <label className="classic-check-option">
                  <input defaultChecked={answers.housing.rent} name="housingRent" type="checkbox" />
                  Alugo
                </label>
                <label className="classic-check-option">
                  <input defaultChecked={answers.housing.ownHome} name="housingOwnHome" type="checkbox" />
                  Possuo uma casa
                </label>
                <label className="classic-check-option">
                  <input
                    defaultChecked={answers.housing.planBuyHome}
                    name="housingPlanBuyHome"
                    type="checkbox"
                  />
                  Planejo comprar uma casa
                </label>
              </QuestionCard>

              <QuestionCard index={10} title="Você utiliza cartão de crédito?">
                <label className="classic-radio-option">
                  <input
                    defaultChecked={answers.usesCreditCard}
                    name="usesCreditCard"
                    type="radio"
                    value="yes"
                  />
                  Sim
                </label>
                <label className="classic-radio-option">
                  <input
                    defaultChecked={!answers.usesCreditCard}
                    name="usesCreditCard"
                    type="radio"
                    value="no"
                  />
                  Não
                </label>
              </QuestionCard>

              <QuestionCard
                index={11}
                title="Você tem filhos? Se tiver, quais sao as suas idades? (Marque o que se aplicar.)"
              >
                <label className="classic-check-option">
                  <input
                    defaultChecked={answers.childrenAgeGroups.none}
                    name="childrenNone"
                    type="checkbox"
                  />
                  Não tenho filhos
                </label>
                <label className="classic-check-option">
                  <input
                    defaultChecked={answers.childrenAgeGroups.under10}
                    name="childrenUnder10"
                    type="checkbox"
                  />
                  Abaixo de 10
                </label>
                <label className="classic-check-option">
                  <input
                    defaultChecked={answers.childrenAgeGroups.between11And17}
                    name="childrenBetween11And17"
                    type="checkbox"
                  />
                  Idade de 11 a 17
                </label>
                <label className="classic-check-option">
                  <input
                    defaultChecked={answers.childrenAgeGroups.over18}
                    name="childrenOver18"
                    type="checkbox"
                  />
                  Acima de 18
                </label>
              </QuestionCard>

              <QuestionCard index={12} title="Você sustenta alguma pessoa adulta?">
                <label className="classic-radio-option">
                  <input
                    defaultChecked={answers.supportsAdult}
                    name="supportsAdult"
                    type="radio"
                    value="yes"
                  />
                  Sim
                </label>
                <label className="classic-radio-option">
                  <input
                    defaultChecked={!answers.supportsAdult}
                    name="supportsAdult"
                    type="radio"
                    value="no"
                  />
                  Não
                </label>
              </QuestionCard>

              <QuestionCard index={13} title="Você possui ações, titulos ou fundos de investimentos?">
                <label className="classic-radio-option">
                  <input
                    defaultChecked={answers.hasInvestments}
                    name="hasInvestments"
                    type="radio"
                    value="yes"
                  />
                  Sim
                </label>
                <label className="classic-radio-option">
                  <input
                    defaultChecked={!answers.hasInvestments}
                    name="hasInvestments"
                    type="radio"
                    value="no"
                  />
                  Não
                </label>
              </QuestionCard>

              <QuestionCard index={14} title="Você tem um plano de aposentadoria ou investimentos para aposentadoria?">
                <label className="classic-radio-option">
                  <input
                    defaultChecked={answers.hasRetirementPlan}
                    name="hasRetirementPlan"
                    type="radio"
                    value="yes"
                  />
                  Sim
                </label>
                <label className="classic-radio-option">
                  <input
                    defaultChecked={!answers.hasRetirementPlan}
                    name="hasRetirementPlan"
                    type="radio"
                    value="no"
                  />
                  Não
                </label>
              </QuestionCard>

              <QuestionCard index={15} title="Desejá monitorar bem de perto suas despesas e saber exatamente para onde vai o seu dinheiro?">
                <label className="classic-radio-option">
                  <input
                    defaultChecked={answers.wantsExpenseMonitoring}
                    name="wantsExpenseMonitoring"
                    type="radio"
                    value="yes"
                  />
                  Sim
                </label>
                <label className="classic-radio-option">
                  <input
                    defaultChecked={!answers.wantsExpenseMonitoring}
                    name="wantsExpenseMonitoring"
                    type="radio"
                    value="no"
                  />
                  Não
                </label>
              </QuestionCard>

              <QuestionCard index={16} title="Gostaria de ler noticias orientadas a você e suas financas?">
                <label className="classic-radio-option">
                  <input
                    defaultChecked={answers.wantsFinanceNews}
                    name="wantsFinanceNews"
                    type="radio"
                    value="yes"
                  />
                  Sim
                </label>
                <label className="classic-radio-option">
                  <input
                    defaultChecked={!answers.wantsFinanceNews}
                    name="wantsFinanceNews"
                    type="radio"
                    value="no"
                  />
                  Não
                </label>
              </QuestionCard>

              <QuestionCard index={17} title="Dos recursos do Deniaros, quais sao os que mais lhe interessam? (Marque tudo o que se aplicar.)">
                <label className="classic-check-option">
                  <input
                    defaultChecked={answers.featureInterests.monitorBalances}
                    name="featureMonitorBalances"
                    type="checkbox"
                  />
                  Ler extratos e monitorar saldos de contas
                </label>
                <label className="classic-check-option">
                  <input
                    defaultChecked={answers.featureInterests.payBills}
                    name="featurePayBills"
                    type="checkbox"
                  />
                  Pagar contas
                </label>
                <label className="classic-check-option">
                  <input
                    defaultChecked={answers.featureInterests.investmentNews}
                    name="featureInvestmentNews"
                    type="checkbox"
                  />
                  Acompanhar noticias de investimentos
                </label>
                <label className="classic-check-option">
                  <input
                    defaultChecked={answers.featureInterests.stockQuotes}
                    name="featureStockQuotes"
                    type="checkbox"
                  />
                  Fazer download de cotações de ações
                </label>
                <label className="classic-check-option">
                  <input
                    defaultChecked={answers.featureInterests.taxInfo}
                    name="featureTaxInfo"
                    type="checkbox"
                  />
                  Receber informações de impostos
                </label>
              </QuestionCard>

              <QuestionCard index={18} title="Você e profissional autonomo?">
                <label className="classic-radio-option">
                  <input
                    defaultChecked={answers.isSelfEmployed}
                    name="isSelfEmployed"
                    type="radio"
                    value="yes"
                  />
                  Sim
                </label>
                <label className="classic-radio-option">
                  <input
                    defaultChecked={!answers.isSelfEmployed}
                    name="isSelfEmployed"
                    type="radio"
                    value="no"
                  />
                  Não
                </label>
              </QuestionCard>

              <footer className="classic-profile-footer">
                <div className="form-actions">
                  <button className="ghost-button" formAction={resetPersonalProfile} type="submit">
                    Refazer respostas
                  </button>
                  <Link className="ghost-button" href={nextPath ?? "/"}>
                    Cancelar
                  </Link>
                  <button className="primary-button" type="submit">
                    Concluir as respostas as perguntas
                  </button>
                </div>
              </footer>
            </form>
          </section>
        </section>
        <SpouseQuestionGuard />
      </section>
    </AppShell>
  );
}

function QuestionCard({
  children,
  disabled,
  index,
  isSpouseQuestion,
  title
}: {
  children: React.ReactNode;
  disabled?: boolean;
  index: number;
  isSpouseQuestion?: boolean;
  title: string;
}) {
  const className = `classic-question-card${disabled ? " classic-question-card-blocked" : ""}`;

  return (
    <article
      aria-disabled={disabled ? "true" : undefined}
      className={className}
      data-spouse-question={isSpouseQuestion ? "true" : undefined}
      id={`q-${index}`}
    >
      <div className="classic-question-index">
        <strong>{String(index).padStart(2, "0")}</strong>
      </div>
      <div className="classic-question-body">
        <h4>{title}</h4>
        <div className="classic-question-fields">{children}</div>
      </div>
    </article>
  );
}

function getQuestionProgress(answers: {
  firstName: string;
  lastName: string;
  birthDate: string;
  financesScope: "self" | "self_and_spouse";
  spouseFirstName: string;
  spouseLastName: string;
  spouseBirthDate: string;
  maritalStatus: "married" | "not_married";
  housing: {
    rent: boolean;
    ownHome: boolean;
    planBuyHome: boolean;
  };
  usesCreditCard: boolean;
  childrenAgeGroups: {
    none: boolean;
    under10: boolean;
    between11And17: boolean;
    over18: boolean;
  };
  supportsAdult: boolean;
  hasInvestments: boolean;
  hasRetirementPlan: boolean;
  wantsExpenseMonitoring: boolean;
  wantsFinanceNews: boolean;
  featureInterests: {
    monitorBalances: boolean;
    payBills: boolean;
    investmentNews: boolean;
    stockQuotes: boolean;
    taxInfo: boolean;
  };
  isSelfEmployed: boolean;
}) {
  return [
    Boolean(answers.firstName),
    Boolean(answers.lastName),
    Boolean(answers.birthDate),
    true,
    answers.financesScope === "self" || Boolean(answers.spouseFirstName),
    answers.financesScope === "self" || Boolean(answers.spouseLastName),
    answers.financesScope === "self" || Boolean(answers.spouseBirthDate),
    true,
    answers.housing.rent || answers.housing.ownHome || answers.housing.planBuyHome,
    true,
    answers.childrenAgeGroups.none ||
      answers.childrenAgeGroups.under10 ||
      answers.childrenAgeGroups.between11And17 ||
      answers.childrenAgeGroups.over18,
    true,
    true,
    true,
    true,
    true,
    answers.featureInterests.monitorBalances ||
      answers.featureInterests.payBills ||
      answers.featureInterests.investmentNews ||
      answers.featureInterests.stockQuotes ||
      answers.featureInterests.taxInfo,
    true
  ];
}

function normalizeNextPath(value?: string) {
  const path = String(value ?? "").trim();

  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  if (path.startsWith("/personal-profile")) {
    return "/";
  }

  return path;
}
