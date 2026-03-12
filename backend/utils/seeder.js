const mongoose = require('mongoose');
const User         = require('../models/User');
const Subject      = require('../models/Subject');
const Application  = require('../models/Application');
const Project      = require('../models/Project');
const Milestone    = require('../models/Milestone');
const Message      = require('../models/Message');
const Notification = require('../models/Notification');
const Group        = require('../models/Group');
require('dotenv').config();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await User.deleteMany({});
  await Subject.deleteMany({});
  await Application.deleteMany({});
  await Project.deleteMany({});
  await Milestone.deleteMany({});
  await Message.deleteMany({});
  await Notification.deleteMany({});
  await Group.deleteMany({});

  // Users
  const admin = await User.create({ nom:'Admin', prenom:'Super', email:'admin@pfe.com', motDePasse:'Admin@123', role:'ROLE_ADMIN', departement:'Administration', statut:'actif' });
  const sup1  = await User.create({ nom:'Benali', prenom:'Mohammed', email:'supervisor@pfe.com', motDePasse:'Super@123', role:'ROLE_SUPERVISOR', departement:'Informatique', statut:'actif' });
  const sup2  = await User.create({ nom:'Cherkaoui', prenom:'Fatima', email:'supervisor2@pfe.com', motDePasse:'Super@123', role:'ROLE_SUPERVISOR', departement:'Réseaux', statut:'actif' });
  const stu1  = await User.create({ nom:'Alami', prenom:'Youssef', email:'student@pfe.com', motDePasse:'Student@123', role:'ROLE_STUDENT', departement:'Informatique', statut:'actif' });
  const stu2  = await User.create({ nom:'El Idrissi', prenom:'Salma', email:'student2@pfe.com', motDePasse:'Student@123', role:'ROLE_STUDENT', departement:'Informatique', statut:'actif' });
  const stu3  = await User.create({ nom:'Tahiri', prenom:'Omar', email:'student3@pfe.com', motDePasse:'Student@123', role:'ROLE_STUDENT', departement:'Réseaux', statut:'actif' });

  // Subjects
  const [subj1, subj2, subj3, subj4, subj5] = await Subject.create([
    { titre:"Développement d'une application de gestion de stock", description:"Application web complète pour gérer les stocks avec tableaux de bord et rapports.", technologies:['React','Node.js','MongoDB','Express'], nombreMaxEtudiants:2, encadrantId:sup1._id, statut:'validé' },
    { titre:"Plateforme d'e-learning avec IA", description:"Plateforme d'apprentissage en ligne intégrant l'IA pour personnaliser le parcours.", technologies:['React','Python','TensorFlow','Flask'], nombreMaxEtudiants:3, encadrantId:sup1._id, statut:'validé' },
    { titre:"Système de détection d'intrusion réseau", description:"Système IDS/IPS basé sur le machine learning pour détecter les intrusions en temps réel.", technologies:['Python','Scikit-learn','Wireshark','Docker'], nombreMaxEtudiants:2, encadrantId:sup2._id, statut:'validé' },
    { titre:"Application mobile de santé connectée", description:"Application mobile pour le suivi de santé avec IoT.", technologies:['React Native','Node.js','MongoDB','IoT'], nombreMaxEtudiants:2, encadrantId:sup2._id, statut:'proposé' },
    { titre:"Blockchain pour la traçabilité alimentaire", description:"Solution blockchain pour la traçabilité dans la chaîne alimentaire.", technologies:['Ethereum','Solidity','React','Web3.js'], nombreMaxEtudiants:2, encadrantId:sup1._id, statut:'validé' },
  ]);

  // Group 1: stu1 (chef) + stu2  → project active
  const group1 = await Group.create({
    nom: 'Équipe Alpha',
    chef: stu1._id,
    membres: [stu1._id, stu2._id],
    invitations: [{ userId: stu2._id, statut: 'accepté' }],
  });

  const app1 = await Application.create({
    groupId: group1._id, sujetId: subj1._id,
    motivation: "Notre groupe maîtrise React et Node.js. Nous sommes motivés pour concevoir une solution complète.",
    statut: 'accepté', commentaireEncadrant: 'Excellent groupe, bienvenue!'
  });

  const project1 = await Project.create({
    sujetId: subj1._id, groupId: group1._id,
    etudiants: [stu1._id, stu2._id], encadrantId: sup1._id,
    statut: 'en cours', progression: 35,
    dateFin: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  });
  await Subject.findByIdAndUpdate(subj1._id, { statut: 'complet' });

  const milestones = ['Cahier des charges','Développement Frontend','Développement Backend','Tests','Documentation','Soutenance'];
  for (let i = 0; i < milestones.length; i++) {
    await Milestone.create({ projectId: project1._id, nomEtape: milestones[i], ordre: i+1, statut: i<2?'terminé':i===2?'en cours':'à faire' });
  }

  // Demo messages — visible to BOTH stu1, stu2, and supervisor
  const msgs = [
    { senderId: sup1._id,  content: "Bonjour à l'équipe Alpha! Bienvenue sur votre projet. Je suis disponible pour vos questions." },
    { senderId: stu1._id,  content: "Bonjour Professeur Benali! Merci. Nous avons commencé l'analyse des besoins." },
    { senderId: stu2._id,  content: "Bonjour! J'ai préparé les maquettes UI, je vais les partager bientôt." },
    { senderId: sup1._id,  content: "Parfait Salma. Pour le cahier des charges, incluez les diagrammes UML et les cas d'utilisation." },
    { senderId: stu1._id,  content: "Compris! On utilise Draw.io. On aura le document prêt d'ici vendredi." },
    { senderId: stu2._id,  content: "J'ai terminé les wireframes. Voici le lien Figma: https://figma.com/..." },
    { senderId: sup1._id,  content: "Très bien! Les wireframes sont propres. Pensez à valider avec les utilisateurs finaux avant de coder." },
  ];
  const now = Date.now();
  for (let i = 0; i < msgs.length; i++) {
    await Message.create({
      ...msgs[i], type: 'text', projectId: project1._id,
      readBy: [msgs[i].senderId],
      createdAt: new Date(now - (msgs.length - i) * 3600000),
      updatedAt: new Date(now - (msgs.length - i) * 3600000),
    });
  }

  // Group 2: stu3 alone, candidature en attente
  const group2 = await Group.create({ nom: 'DevSecOps', chef: stu3._id, membres: [stu3._id] });
  await Application.create({
    groupId: group2._id, sujetId: subj3._id,
    motivation: "Passionné par la sécurité réseau avec expérience en stage.", statut: 'en attente'
  });

  console.log('\n✅ Seeding completed!\n');
  console.log('📋 Comptes de test:');
  console.log('  Admin:       admin@pfe.com      / Admin@123');
  console.log('  Encadrant 1: supervisor@pfe.com  / Super@123');
  console.log('  Encadrant 2: supervisor2@pfe.com / Super@123');
  console.log('  Étudiant 1:  student@pfe.com     / Student@123  → Groupe "Équipe Alpha" (chef) + projet actif + messages');
  console.log('  Étudiant 2:  student2@pfe.com    / Student@123  → Membre "Équipe Alpha" (peut voir tout)');
  console.log('  Étudiant 3:  student3@pfe.com    / Student@123  → Groupe "DevSecOps" (candidature en attente)');
  process.exit(0);
};
seed().catch(err => { console.error(err); process.exit(1); });
