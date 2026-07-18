# Manual acceptance test checklist

Use this checklist before merging or deploying `feature/quality-command-center`.

## Test setup

- [ ] Start the web app, quality API, AI service, MongoDB, and Qdrant.
- [ ] Open `http://localhost:3000` in a private browser window.
- [ ] Keep browser developer tools open and confirm no red console errors during the tests.
- [ ] Use a fresh Clerk account once to test first-login onboarding.
- [ ] Use the mock NCR below for the create-and-investigate workflow.

### Mock NCR

| Field | Value |
|---|---|
| Problem statement | ERW tube outside diameter exceeds the upper specification limit |
| Division | Tube Products |
| Severity | High |
| Supplier / source | Southern Alloy Steels |
| Component | 38 mm ERW precision tube |
| Immediate observation | Outside diameter measured between 38.34 mm and 38.41 mm against the approved specification of 38.00 ± 0.20 mm. The deviation was observed in Lot TP-1807-B during final inspection. The finished tubes and associated incoming coil are quarantined. |

## 1. Authentication and first-login onboarding

- [ ] An anonymous visit redirects to Clerk instead of displaying protected data.
- [ ] **Sign up** opens the Clerk registration flow.
- [ ] Email verification completes and returns to the application.
- [ ] The four-step product walkthrough appears for a new user.
- [ ] **Next** advances one step.
- [ ] **Back** returns one step without losing progress.
- [ ] **Skip tour** closes the walkthrough.
- [ ] Reloading after Skip does not show the walkthrough again.
- [ ] With another fresh account, **Enter workspace** on the last step also persists completion.
- [ ] The top-right user avatar opens Clerk account management.
- [ ] **Sign out** returns the user to the protected sign-in boundary.
- [ ] Signing back in restores that user's own NCRs and investigations.

## 2. Global header and responsive navigation

- [ ] The desktop sidebar highlights the active destination.
- [ ] **Command center** opens the dashboard and removes the hash from the URL.
- [ ] **Non-conformance** opens `#nonconformance`.
- [ ] **8D investigations** opens `#investigations`.
- [ ] **Suppliers** opens `#suppliers`.
- [ ] **Knowledge base** opens `#knowledge`.
- [ ] **Reports** opens `#reports`.
- [ ] **Settings** opens `#settings`.
- [ ] Browser Back and Forward restore the previous workspace destination.
- [ ] The sidebar NCR and investigation counts reflect current records.
- [ ] The top **New NCR** button opens the create dialog from every destination.
- [ ] At a mobile width, the hamburger opens the sidebar drawer.
- [ ] Selecting a mobile navigation item closes the drawer.
- [ ] Clicking the mobile backdrop closes the drawer.
- [ ] No page introduces horizontal overflow at 390 px width.

## 3. Search, filtering, and notifications

- [ ] Searching by NCR number shows only matching records.
- [ ] Searching by supplier shows only that supplier's records.
- [ ] Searching by component text works case-insensitively.
- [ ] The severity selector filters High, Medium, and Low records correctly.
- [ ] **Clear filters** clears both the search query and severity selection.
- [ ] A no-match search shows the empty-state message.
- [ ] The notification icon shows an alert dot when active High NCRs exist.
- [ ] Clicking the notification icon opens the notification drawer.
- [ ] Each alert displays its NCR, title, supplier, and current status.
- [ ] Clicking an alert closes the drawer and opens that NCR in the register.
- [ ] The drawer close button works.
- [ ] The drawer backdrop works.

## 4. NCR creation and lifecycle

- [ ] **New NCR** opens the modal.
- [ ] The close icon closes the modal.
- [ ] **Cancel** closes the modal.
- [ ] Clicking outside the modal closes it.
- [ ] Required fields prevent an empty submission.
- [ ] Submit the supplied mock NCR.
- [ ] A success toast contains the new NCR number.
- [ ] The new NCR becomes the selected command-center record.
- [ ] Reloading retains the NCR, proving MongoDB persistence.
- [ ] Selecting another NCR updates the detail panel and Copilot context.
- [ ] In the Non-conformance page, the record detail shows all captured values.
- [ ] Change Status from Open to **In progress** and confirm the toast.
- [ ] Reload and confirm the status remains In progress.
- [ ] Repeat with **Review**.
- [ ] Repeat with **Closed** and confirm open-NCR metrics decrease.
- [ ] **Open in 8D Copilot** returns to the command center with the same NCR selected.
- [ ] A deliberately stopped API produces an error toast and does not pretend the NCR was saved.

## 5. Evidence-backed Copilot

- [ ] Select the new mock NCR.
- [ ] Before generation, the Copilot clearly states that no draft exists.
- [ ] **Generate evidence-backed draft** shows a loading state.
- [ ] Completion shows a saved-draft timestamp.
- [ ] The result contains NCR-specific containment and root-cause checks.
- [ ] **How was this generated?** expands the Qdrant retrieval explanation and storage location.
- [ ] Every evidence chip displays a source ID and relevance percentage.
- [ ] Clicking an evidence chip opens the matching Knowledge document.
- [ ] Closing that evidence modal leaves the Knowledge page usable.
- [ ] Return to Command center and **Regenerate evidence-backed draft**.
- [ ] Regeneration creates a new history entry rather than overwriting the audit record.
- [ ] **Open saved investigation** opens the correct draft in 8D history.
- [ ] Reload and confirm generated drafts remain available.

## 6. 8D investigation history and review progress

- [ ] The left history list shows every saved draft.
- [ ] Selecting a history item updates the full detail view.
- [ ] Generated timestamp and thread ID are present.
- [ ] The storage label identifies MongoDB investigation history.
- [ ] Retrieval flow shows Problem → Qdrant → Approved evidence → Draft.
- [ ] Containment and root-cause checks are individually selectable.
- [ ] Select at least two checklist items.
- [ ] Change the workflow stage to **Corrective action**.
- [ ] Enter engineer review notes with an owner and measured result.
- [ ] **Save review progress** shows a success toast.
- [ ] Reload and confirm checked items, stage, and notes persist.
- [ ] Evidence cards include ID, title, match score, and excerpt.
- [ ] Recommended next action is visible.
- [ ] Engineer-review disclaimer is visible.
- [ ] **Open NCR** returns to the associated command-center record.
- [ ] One user's investigation history is not visible after signing in as another user.

## 7. Supplier quality

- [ ] Supplier metrics are derived from the current NCR list.
- [ ] Suppliers are ordered with higher-risk sources first.
- [ ] Each row shows divisions, NCR count, High count, and risk status.
- [ ] Clicking a supplier row opens the Non-conformance page.
- [ ] The register is automatically filtered to that supplier.
- [ ] Clear filters returns the complete NCR register.

## 8. Knowledge base

- [ ] Four approved evidence documents are displayed.
- [ ] Each card shows document ID, type, division, revision, and indexed state.
- [ ] Clicking each card opens its evidence-review modal.
- [ ] The modal excerpt matches the selected source.
- [ ] The retrieval-boundary warning is visible.
- [ ] The modal close icon works.
- [ ] Clicking outside the modal closes it.
- [ ] **Done reviewing** closes it.
- [ ] Stopping the AI service causes a controlled fallback or error state without crashing the page.

## 9. Reports

- [ ] Total NCR count matches the register.
- [ ] High-severity count and percentage are correct.
- [ ] Saved 8D draft count matches investigation history.
- [ ] Evidence coverage reflects whether saved drafts have citations.
- [ ] Severity bars match current High, Medium, and Low counts.
- [ ] **Export CSV** downloads a dated CSV file.
- [ ] The CSV opens and contains NCR, problem, division, supplier, component, severity, and status.
- [ ] Values containing commas remain in one CSV column.
- [ ] **Print report** opens the browser print dialog.
- [ ] The print preview omits navigation and interactive controls.

## 10. Settings and service health

- [ ] Settings initially distinguishes configured controls from services not yet checked.
- [ ] **Test all connections** shows a loading state.
- [ ] A successful check reports MongoDB, FastAPI, and Qdrant as connected.
- [ ] The overall status and checked timestamp appear.
- [ ] Stop one backend service and retest.
- [ ] The page reports a degraded state instead of falsely showing connected.
- [ ] Restart the service and confirm the next check recovers.

## 11. Accessibility and failure handling

- [ ] Tab navigation reaches sidebar items, filters, NCR rows, Copilot actions, modals, and account controls.
- [ ] Focus indicators remain visible.
- [ ] Enter/Space activates buttons.
- [ ] Every icon-only button has an accessible label.
- [ ] Dialogs expose a visible title and close control.
- [ ] Loading buttons cannot be double-submitted.
- [ ] Error toasts use understandable language without exposing secrets.
- [ ] No Clerk, MongoDB, Qdrant, or internal API key appears in browser output.
- [ ] Refreshing any hash destination keeps the user inside the authenticated workspace.

