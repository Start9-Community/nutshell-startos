import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

function parse(relativePath: string) {
  return ts.createSourceFile(
    relativePath,
    readFileSync(new URL(relativePath, import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
}

function descendants<T extends ts.Node>(
  root: ts.Node,
  predicate: (node: ts.Node) => node is T,
) {
  const matches: T[] = []
  const visit = (node: ts.Node) => {
    if (predicate(node)) matches.push(node)
    ts.forEachChild(node, visit)
  }
  visit(root)
  return matches
}

function isCallNamed(node: ts.Node, name: string): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false
  if (ts.isIdentifier(node.expression)) return node.expression.text === name
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === name
  )
}

function callsNamed(root: ts.Node, name: string) {
  return descendants(root, (node): node is ts.CallExpression =>
    isCallNamed(node, name),
  )
}

test('main reactively resolves only the stored backend', () => {
  const source = parse('../startos/main.ts')
  const selectedCalls = callsNamed(source, 'resolveSelectedRuntime')
  assert.equal(selectedCalls.length, 1)
  assert.equal(selectedCalls[0].arguments[0]?.getText(source), 'backendState')

  const resolver = selectedCalls[0].arguments[1]
  assert.ok(resolver && ts.isArrowFunction(resolver))
  const connectionCalls = callsNamed(resolver, 'resolveLightningConnection')
  assert.equal(connectionCalls.length, 1)
  assert.deepEqual(
    connectionCalls[0].arguments.map((argument) => argument.getText(source)),
    ['effects', 'backend', "'reactive'"],
  )

  const backendReads = callsNamed(source, 'const').filter((call) => {
    if (!ts.isPropertyAccessExpression(call.expression)) return false
    const read = call.expression.expression
    if (!isCallNamed(read, 'read')) return false
    if (!ts.isPropertyAccessExpression(read.expression)) return false
    return (
      read.expression.expression.getText(source) === 'storeJson' &&
      read.arguments[0]?.getText(source) ===
        '(store) => store.lightningBackend' &&
      call.arguments[0]?.getText(source) === 'effects'
    )
  })
  assert.equal(backendReads.length, 1)

  const hardcodedBackends = descendants(
    source,
    (node): node is ts.StringLiteral => ts.isStringLiteral(node),
  ).filter((literal) => ['clnrest', 'lndrest'].includes(literal.text))
  assert.deepEqual(hardcodedBackends, [])
})

test('selected connection resolution applies its requested read mode', () => {
  const source = parse('../startos/lightningConnection.ts')
  const functions = descendants(
    source,
    (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node),
  )

  const cln = functions.find((fn) => fn.name?.text === 'resolveClnConnection')
  const lnd = functions.find((fn) => fn.name?.text === 'resolveLndConnection')
  const selected = functions.find(
    (fn) => fn.name?.text === 'resolveLightningConnection',
  )
  assert.ok(cln && lnd && selected)

  const clnReads = callsNamed(cln, 'readConnectionValue')
  const lndReads = callsNamed(lnd, 'readConnectionValue')
  assert.equal(clnReads.length, 2)
  assert.equal(lndReads.length, 1)
  for (const read of [...clnReads, ...lndReads]) {
    assert.equal(read.arguments[1]?.getText(source), 'readMode')
  }

  const modeParameter = selected.parameters.find(
    (parameter) => parameter.name.getText(source) === 'readMode',
  )
  assert.equal(modeParameter?.initializer?.getText(source), "'one-shot'")
})

test('main consumes the selected mount and connection contracts', () => {
  const source = parse('../startos/main.ts')

  const mountCalls = callsNamed(source, 'buildMintMounts')
  assert.equal(mountCalls.length, 1)
  assert.equal(mountCalls[0].arguments[0]?.getText(source), 'runtime.mounts')

  const environmentCalls = callsNamed(source, 'buildMintEnvironment')
  assert.equal(environmentCalls.length, 1)
  assert.equal(
    environmentCalls[0].arguments[2]?.getText(source),
    'runtime.connection',
  )

  const volumeCalls = callsNamed(source, 'mountVolume')
  assert.equal(volumeCalls.length, 1)
  assert.equal(volumeCalls[0].arguments[0]?.getText(source), 'policy.main')

  const dependencyCalls = callsNamed(source, 'mountDependency')
  assert.equal(dependencyCalls.length, 1)
  assert.equal(dependencyCalls[0].arguments[0]?.getText(source), 'dependency')
})

test('main prepares LND trust and credentials in the daemon subcontainer', () => {
  const source = parse('../startos/main.ts')

  const certificateCalls = callsNamed(source, 'getSslCertificate')
  assert.equal(certificateCalls.length, 1)
  assert.deepEqual(
    certificateCalls[0].arguments.map((argument) => argument.getText(source)),
    ['effects', '[]'],
  )

  const prepareCalls = callsNamed(source, 'prepareRuntimeCredentials')
  assert.equal(prepareCalls.length, 1)
  assert.deepEqual(
    prepareCalls[0].arguments
      .slice(0, 2)
      .map((argument) => argument.getText(source)),
    ['runtime', 'rootCa'],
  )

  const writes = callsNamed(prepareCalls[0], 'writeFile')
  assert.equal(writes.length, 1)
  assert.equal(
    (writes[0].expression as ts.PropertyAccessExpression).expression.getText(
      source,
    ),
    'subcontainer',
  )

  const credentialChecks = callsNamed(prepareCalls[0], 'execFail')
  assert.equal(credentialChecks.length, 1)
  assert.equal(
    (
      credentialChecks[0].expression as ts.PropertyAccessExpression
    ).expression.getText(source),
    'subcontainer',
  )

  const daemonCalls = callsNamed(source, 'addDaemon')
  assert.equal(daemonCalls.length, 1)
  const options = daemonCalls[0].arguments[1]
  assert.ok(options && ts.isObjectLiteralExpression(options))
  const daemonSubcontainer = options.properties.find(
    (property) =>
      ts.isShorthandPropertyAssignment(property) &&
      property.name.text === 'subcontainer',
  )
  assert.ok(daemonSubcontainer)

  assert.equal(callsNamed(source, 'checkPortListening').length, 1)
})

test('Mint Status displays the wallet class from stored state', () => {
  const source = parse('../startos/actions/showMintInfo.ts')
  const displayCalls = callsNamed(source, 'backendDisplayName')
  assert.equal(displayCalls.length, 1)
  assert.equal(displayCalls[0].arguments[0]?.getText(source), 'backend')

  const hardcodedWalletNames = descendants(
    source,
    (node): node is ts.StringLiteral => ts.isStringLiteral(node),
  ).filter((literal) =>
    ['CLNRestWallet', 'LndRestWallet'].includes(literal.text),
  )
  assert.deepEqual(hardcodedWalletNames, [])
})
